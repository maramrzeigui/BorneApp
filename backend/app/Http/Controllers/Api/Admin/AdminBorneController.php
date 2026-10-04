<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\BorneResource;
use App\Models\AuditLog;
use App\Models\Borne;
use App\Services\OcppClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminBorneController extends Controller
{
    public function __construct(private readonly OcppClient $ocpp)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return BorneResource::collection(
            Borne::with('connecteurs')->where('source', 'reseau')->orderBy('nom')->get()
        );
    }

    public function store(Request $request): BorneResource
    {
        $data = $this->valider($request, creation: true);
        $connecteurs = $data['connecteurs'];
        unset($data['connecteurs']);

        $borne = Borne::create([...$data, 'etat' => 'disponible', 'dernier_heartbeat' => null]);
        foreach ($connecteurs as $conn) {
            $borne->connecteurs()->create([
                'type' => $conn['type'],
                'puissance_kw' => $conn['puissanceKw'],
                'etat' => 'disponible',
            ]);
        }

        AuditLog::record($request->user()->id, 'creation', 'borne:'.$borne->id, $borne->nom);

        return new BorneResource($borne->load('connecteurs'));
    }

    public function update(Request $request, Borne $borne): BorneResource
    {
        $data = $this->valider($request, creation: false, borne: $borne);
        unset($data['connecteurs']);

        $borne->update($data);
        AuditLog::record($request->user()->id, 'modification', 'borne:'.$borne->id, $borne->nom);

        return new BorneResource($borne->load('connecteurs'));
    }

    /** Désactivation (le cahier des charges ne prévoit pas de suppression physique). */
    public function destroy(Request $request, Borne $borne): JsonResponse
    {
        $borne->update(['etat' => 'hors_service']);
        $borne->connecteurs()->update(['etat' => 'indisponible']);
        AuditLog::record($request->user()->id, 'desactivation', 'borne:'.$borne->id, $borne->nom);

        return response()->json(['message' => 'Borne désactivée.']);
    }

    /** Commandes OCPP distantes : Reset / UnlockConnector. */
    public function commande(Request $request, Borne $borne): JsonResponse
    {
        $data = $request->validate(['commande' => ['required', 'in:reset,unlock']]);

        $resultat = match ($data['commande']) {
            'reset' => $this->ocpp->reset($borne->reference),
            'unlock' => $this->ocpp->unlock($borne->reference, $borne->connecteurs()->value('id') ?? 0),
        };

        AuditLog::record($request->user()->id, 'commande_ocpp', 'borne:'.$borne->id, $data['commande']);

        return response()->json(['message' => $resultat['message']], $resultat['ok'] ? 200 : 502);
    }

    private function valider(Request $request, bool $creation, ?Borne $borne = null): array
    {
        $unique = $creation ? '' : ','.$borne->id;

        $data = $request->validate([
            'nom' => [$creation ? 'required' : 'sometimes', 'string', 'max:150'],
            'reference' => [$creation ? 'required' : 'sometimes', 'string', 'unique:bornes,reference'.$unique],
            'numeroSerie' => [$creation ? 'required' : 'sometimes', 'string', 'unique:bornes,numero_serie'.$unique],
            'modele' => [$creation ? 'required' : 'sometimes', 'string'],
            'fabricant' => [$creation ? 'required' : 'sometimes', 'string'],
            'adresse' => [$creation ? 'required' : 'sometimes', 'string'],
            'latitude' => [$creation ? 'required' : 'sometimes', 'numeric', 'between:-90,90'],
            'longitude' => [$creation ? 'required' : 'sometimes', 'numeric', 'between:-180,180'],
            'versionFirmware' => [$creation ? 'required' : 'sometimes', 'string'],
            'versionOcpp' => [$creation ? 'required' : 'sometimes', 'in:1.6,2.0.1'],
            'puissanceKw' => [$creation ? 'required' : 'sometimes', 'integer', 'min:1'],
            'tarifKwh' => [$creation ? 'required' : 'sometimes', 'numeric', 'min:0'],
            'etat' => ['sometimes', 'in:disponible,occupee,hors_service,maintenance,deconnectee,defaut'],
            'connecteurs' => [$creation ? 'required' : 'sometimes', 'array', 'min:1'],
            'connecteurs.*.type' => ['required_with:connecteurs', 'in:CCS,Type2,CHAdeMO,AC,DC'],
            'connecteurs.*.puissanceKw' => ['required_with:connecteurs', 'integer', 'min:1'],
        ]);

        // camelCase (API) → snake_case (colonnes)
        $mapping = [
            'numeroSerie' => 'numero_serie',
            'versionFirmware' => 'version_firmware',
            'versionOcpp' => 'version_ocpp',
            'puissanceKw' => 'puissance_kw',
            'tarifKwh' => 'tarif_kwh',
        ];
        foreach ($mapping as $camel => $snake) {
            if (array_key_exists($camel, $data)) {
                $data[$snake] = $data[$camel];
                unset($data[$camel]);
            }
        }

        $data['connecteurs'] ??= [];

        return $data;
    }
}
