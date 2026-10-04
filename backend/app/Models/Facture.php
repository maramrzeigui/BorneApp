<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['session_recharge_id', 'user_id', 'numero', 'date', 'montant_ttc', 'chemin_pdf'])]
class Facture extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'montant_ttc' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
