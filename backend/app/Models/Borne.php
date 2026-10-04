<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'source', 'source_id', 'operateur', 'nom', 'reference', 'numero_serie', 'modele', 'fabricant', 'adresse',
    'latitude', 'longitude', 'version_firmware', 'version_ocpp',
    'puissance_kw', 'etat', 'dernier_heartbeat', 'temperature_c', 'tarif_kwh',
])]
class Borne extends Model
{
    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'puissance_kw' => 'integer',
            'dernier_heartbeat' => 'datetime',
            'temperature_c' => 'float',
            'tarif_kwh' => 'float',
        ];
    }

    public function connecteurs(): HasMany
    {
        return $this->hasMany(Connecteur::class);
    }

    public function alertes(): HasMany
    {
        return $this->hasMany(Alerte::class);
    }
}
