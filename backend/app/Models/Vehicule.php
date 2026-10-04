<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'marque', 'modele', 'immatriculation', 'type_connecteur', 'capacite_batterie_kwh'])]
class Vehicule extends Model
{
    protected function casts(): array
    {
        return ['capacite_batterie_kwh' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
