<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SessionRechargeResource;
use App\Models\Connecteur;
use App\Models\Facture;
use App\Models\MesureRecharge;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\SessionRecharge;
use App\Services\OcppClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SessionRechargeController extends Controller
{
    public function __construct(private readonly OcppClient $ocpp)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $sessions = $request->user()->sessions()
            ->with(['borne', 'connecteur'])
            ->orderByDesc('date_debut')
            ->limit(100)
            ->get();

        return SessionRechargeResource::collection($sessions);
    }

    public function active(Request $request): SessionRechargeResource|Response
    {
        $session = $request->user()->sessions()
            ->with(['borne', 'connecteur'])
            ->whereIn('etat', ['en_cours', 'en_pause'])
            ->latest('date_debut')
            ->first();

        // response()->json(null) produirait "{}" : on renvoie un null JSON littéral.
        return $session
            ? new SessionRechargeResource($session)
            : response('null', 200, ['Content-Type' => 'application/json']);
    }

    /** Courbe de la recharge (MeterValues OCPP), pour le graphique en direct et l’historique. */
    public function mesures(Request $request, SessionRecharge $session): JsonResponse
    {
        abort_unless($session->user_id === $request->user()->id, 403);

        return response()->json(
            MesureRecharge::where('session_recharge_id', $session->id)
                ->orderBy('horodatage')
                ->get()
                ->map(fn (MesureRecharge $m) => [
                    't' => $m->horodatage->toIso8601String(),
                    'energieKwh' => $m->energie_kwh,
                    'puissanceKw' => $m->puissance_kw,
                    'pourcentageBatterie' => $m->pourcentage_batterie,
                ])
        );
    }

    /** Démarre une recharge et relaie un RemoteStartTransaction à la borne. */
    public function store(Request $request): SessionRechargeResource
    {
        $data = $request->validate([
            'borne_id' => ['required', 'exists:bornes,id'],
            'connecteur_id' => ['required', 'exists:connecteurs,id'],
            'vehicule_id' => ['nullable', 'exists:vehicules,id'],
        ]);

        Reservation::expirerPerimees();

        $session = DB::transaction(function () use ($request, $data) {
            $connecteur = Connecteur::where('id', $data['connecteur_id'])
                ->where('borne_id', $data['borne_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($connecteur->borne->source === 'publique') {
                throw ValidationException::withMessages([
                    'borne_id' => ["Borne publique d'un autre opérateur : la recharge se lance depuis la borne ou l'application de l'opérateur."],
                ]);
            }

            // Une prise réservée ne peut être démarrée que par l'auteur de la réservation.
            $reservation = $connecteur->etat === 'reserve'
                ? Reservation::where('connecteur_id', $connecteur->id)
                    ->where('user_id', $request->user()->id)
                    ->where('statut', 'active')
                    ->where('expire_le', '>', now())
                    ->first()
                : null;

            if ($connecteur->etat !== 'disponible' && ! $reservation) {
                throw ValidationException::withMessages([
                    'connecteur_id' => ["Ce connecteur n'est pas disponible."],
                ]);
            }

            $reservation?->update(['statut' => 'utilisee']);

            if ($request->user()->sessions()->whereIn('etat', ['en_cours', 'en_pause'])->exists()) {
                throw ValidationException::withMessages([
                    'session' => ['Une recharge est déjà en cours.'],
                ]);
            }

            $connecteur->update(['etat' => 'occupe']);
            $connecteur->borne->update(['etat' => 'occupee']);

            return SessionRecharge::create([
                'user_id' => $request->user()->id,
                'borne_id' => $data['borne_id'],
                'connecteur_id' => $data['connecteur_id'],
                'vehicule_id' => $data['vehicule_id'] ?? null,
                'date_debut' => now(),
                'energie_kwh' => 0,
                'prix' => 0,
                'etat' => 'en_cours',
            ]);
        });

        // Hors transaction : si le serveur OCPP est éteint la session démarre
        // quand même (mode simulation), la commande est simplement perdue.
        $this->ocpp->remoteStart($session->borne->reference, $session->connecteur_id, $session->id);

        return new SessionRechargeResource($session->load(['borne', 'connecteur']));
    }

    /**
     * Arrête la recharge (RemoteStopTransaction), calcule le prix, débite le
     * wallet (paiement différé si solde insuffisant) et émet la facture.
     */
    public function stop(Request $request, SessionRecharge $session): SessionRechargeResource
    {
        abort_unless($session->user_id === $request->user()->id, 403);
        abort_unless(in_array($session->etat, ['en_cours', 'en_pause']), 409, 'Session déjà terminée.');

        $session = DB::transaction(function () use ($request, $session) {
            $prix = round($session->energie_kwh * $session->borne->tarif_kwh, 2);

            $session->update([
                'etat' => 'terminee',
                'date_fin' => now(),
                'prix' => $prix,
                'puissance_instantanee_kw' => null,
            ]);

            $session->connecteur->update(['etat' => 'disponible']);

            $borne = $session->borne;
            if (! $borne->connecteurs()->where('etat', 'occupe')->exists()) {
                $borne->update(['etat' => 'disponible']);
            }

            if ($prix > 0) {
                $user = $request->user();
                $paye = $user->solde_wallet >= $prix;

                if ($paye) {
                    $user->decrement('solde_wallet', $prix);
                }

                Paiement::create([
                    'user_id' => $user->id,
                    'session_recharge_id' => $session->id,
                    'montant' => $prix,
                    'methode' => 'wallet',
                    'statut' => $paye ? 'paye' : 'en_attente',
                ]);

                Facture::create([
                    'session_recharge_id' => $session->id,
                    'user_id' => $user->id,
                    'numero' => sprintf('FAC-%s-%04d', now()->format('Y'), $session->id),
                    'date' => now()->toDateString(),
                    'montant_ttc' => $prix,
                ]);
            }

            return $session;
        });

        $this->ocpp->remoteStop($session->borne->reference, $session->id);

        return new SessionRechargeResource($session->load(['borne', 'connecteur']));
    }
}
