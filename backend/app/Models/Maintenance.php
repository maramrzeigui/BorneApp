<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['borne_id', 'technicien_id', 'statut', 'description', 'date_prevue'])]
class Maintenance extends Model
{
    protected function casts(): array
    {
        return ['date_prevue' => 'date:Y-m-d'];
    }

    public function borne(): BelongsTo
    {
        return $this->belongsTo(Borne::class);
    }

    public function technicien(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technicien_id');
    }
}
