<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'borne_id', 'connecteur_id', 'vehicule_id',
    'date_debut', 'date_fin', 'energie_kwh', 'prix', 'etat',
    'puissance_instantanee_kw', 'pourcentage_batterie', 'transaction_ocpp_id',
])]
class SessionRecharge extends Model
{
    protected $table = 'sessions_recharge';

    protected function casts(): array
    {
        return [
            'date_debut' => 'datetime',
            'date_fin' => 'datetime',
            'energie_kwh' => 'float',
            'prix' => 'float',
            'puissance_instantanee_kw' => 'float',
            'pourcentage_batterie' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function borne(): BelongsTo
    {
        return $this->belongsTo(Borne::class);
    }

    public function connecteur(): BelongsTo
    {
        return $this->belongsTo(Connecteur::class);
    }
}
