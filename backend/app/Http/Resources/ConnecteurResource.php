<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Sortie alignée sur le type `Connecteur` de l'app mobile. */
class ConnecteurResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'borneId' => $this->borne_id,
            'type' => $this->type,
            'puissanceKw' => $this->puissance_kw,
            'etat' => $this->etat,
        ];
    }
}
