<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Sortie alignée sur le type `Facture` de l'app mobile. */
class FactureResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sessionId' => $this->session_recharge_id,
            'numero' => $this->numero,
            'date' => $this->date->format('Y-m-d'),
            'montantTtc' => $this->montant_ttc,
            'urlPdf' => $this->chemin_pdf,
        ];
    }
}
