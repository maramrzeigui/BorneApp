<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['borne_id', 'type', 'gravite', 'message', 'resolue', 'resolue_le'])]
class Alerte extends Model
{
    protected function casts(): array
    {
        return ['resolue' => 'boolean', 'resolue_le' => 'datetime'];
    }

    public function borne(): BelongsTo
    {
        return $this->belongsTo(Borne::class);
    }
}
