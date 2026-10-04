<?php

namespace App\Http\Controllers\Api\Internal;

use App\Http\Controllers\Controller;
use App\Models\Alerte;
use App\Models\Borne;
use App\Models\MesureRecharge;
use App\Models\SessionRecharge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Réception des événements OCPP relayés par le serveur OCPP (ocpp-server/).
 * Routes protégées par le secret partagé (middleware ocpp.secret).
 */
class OcppEventController extends Controller
{
    /** BootNotification : la borne se connecte. */
    public function boot(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string'],
            'versionFirmware' => ['nullable', 'string'],
        ]);

        $borne = Borne::where('reference', $data['reference'])->first();
        if (! $borne) {
            return response()->json(['message' => 'Borne inconnue'], 404);
        }

        $borne->update(array_filter([
            'etat' => $borne->etat === 'deconnectee' ? 'disponible' : $borne->etat,
            'dernier_heartbeat' => now(),
            'version_firmware' => $data['versionFirmware'] ?? null,
        ]));

        return response()->json(['message' => 'Accepted']);
    }

    /** Heartbeat périodique. */
    public function heartbeat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string'],
            'temperatureC' => ['nullable', 'numeric'],
        ]);

        $borne = Borne::where('reference', $data['reference'])->firstOrFail();
        $misAJour = ['dernier_heartbeat' => now()];

        if (isset($data['temperatureC'])) {
            $misAJour['temperature_c'] = $data['temperatureC'];

            // Alerte automatique de surchauffe (module 12).
            if ($data['temperatureC'] >= 60 && ! $borne->alertes()->where('type', 'surchauffe')->where('resolue', false)->exists()) {
                Alerte::create([
                    'borne_id' => $borne->id,
                    'type' => 'surchauffe',
                    'gravite' => 'critique',
                    'message' => "Température de {$data['temperatureC']} °C sur {$borne->nom}",
                ]);
            }
        }

        if ($borne->etat === 'deconnectee') {
            $misAJour['etat'] = 'disponible';
        }

        $borne->update($misAJour);

        return response()->json(['message' => 'OK']);
    }

    /** StatusNotification : changement d'état d'un connecteur / de la borne. */
    public function status(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string'],
            'etat' => ['required', 'in:disponible,occupee,hors_service,maintenance,deconnectee,defaut'],
        ]);

        $borne = Borne::where('reference', $data['reference'])->firstOrFail();
        $borne->update(['etat' => $data['etat'], 'dernier_heartbeat' => now()]);

        if ($data['etat'] === 'defaut') {
            Alerte::create([
                'borne_id' => $borne->id,
                'type' => 'defaut_materiel',
                'gravite' => 'critique',
                'message' => "Défaut matériel signalé par {$borne->nom}",
            ]);
        }

        return response()->json(['message' => 'OK']);
    }

    /** MeterValues : télémétrie de la session en cours. */
    public function meterValues(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sessionId' => ['required', 'integer'],
            'energieKwh' => ['required', 'numeric', 'min:0'],
            'puissanceKw' => ['nullable', 'numeric', 'min:0'],
            'pourcentageBatterie' => ['nullable', 'integer', 'between:0,100'],
        ]);

        $session = SessionRecharge::find($data['sessionId']);
        if (! $session || ! in_array($session->etat, ['en_cours', 'en_pause'])) {
            return response()->json(['message' => 'Session inconnue ou terminée'], 404);
        }

        $session->update([
            'energie_kwh' => $data['energieKwh'],
            'prix' => round($data['energieKwh'] * $session->borne->tarif_kwh, 2),
            'puissance_instantanee_kw' => $data['puissanceKw'] ?? null,
            'pourcentage_batterie' => $data['pourcentageBatterie'] ?? null,
        ]);

        MesureRecharge::create([
            'session_recharge_id' => $session->id,
            'horodatage' => now(),
            'energie_kwh' => $data['energieKwh'],
            'puissance_kw' => $data['puissanceKw'] ?? null,
            'pourcentage_batterie' => $data['pourcentageBatterie'] ?? null,
        ]);

        return response()->json(['message' => 'OK']);
    }

    /** StopTransaction émis par la borne elle-même (fin côté borne). */
    public function stopTransaction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sessionId' => ['required', 'integer'],
            'energieKwh' => ['nullable', 'numeric', 'min:0'],
        ]);

        $session = SessionRecharge::with(['borne', 'connecteur'])->find($data['sessionId']);
        if (! $session || $session->etat !== 'en_cours') {
            return response()->json(['message' => 'Session inconnue ou déjà terminée'], 404);
        }

        if (isset($data['energieKwh'])) {
            $session->energie_kwh = $data['energieKwh'];
        }

        $session->update([
            'etat' => 'terminee',
            'date_fin' => now(),
            'energie_kwh' => $session->energie_kwh,
            'prix' => round($session->energie_kwh * $session->borne->tarif_kwh, 2),
            'puissance_instantanee_kw' => null,
        ]);

        $session->connecteur->update(['etat' => 'disponible']);
        if (! $session->borne->connecteurs()->where('etat', 'occupe')->exists()) {
            $session->borne->update(['etat' => 'disponible']);
        }

        return response()->json(['message' => 'OK']);
    }
}
