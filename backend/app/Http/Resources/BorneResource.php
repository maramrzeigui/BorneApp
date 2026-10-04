<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Sortie alignée sur le type `Borne` de l'app mobile. */
class BorneResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source' => $this->source,
            'operateur' => $this->operateur,
            'nom' => $this->nom,
            'reference' => $this->reference,
            'numeroSerie' => $this->numero_serie,
            'modele' => $this->modele,
            'fabricant' => $this->fabricant,
            'adresse' => $this->adresse,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'versionFirmware' => $this->version_firmware,
            'versionOcpp' => $this->version_ocpp,
            'puissanceKw' => $this->puissance_kw,
            'etat' => $this->etat,
            'dernierHeartbeat' => $this->dernier_heartbeat?->toIso8601String(),
            'temperatureC' => $this->temperature_c,
            'tarifKwh' => $this->tarif_kwh,
            'connecteurs' => ConnecteurResource::collection($this->whenLoaded('connecteurs')),
        ];
    }
}
