<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['borne_id', 'type', 'puissance_kw', 'etat'])]
class Connecteur extends Model
{
    protected $table = 'connecteurs';

    protected function casts(): array
    {
        return ['puissance_kw' => 'integer'];
    }

    public function borne(): BelongsTo
    {
        return $this->belongsTo(Borne::class);
    }
}
