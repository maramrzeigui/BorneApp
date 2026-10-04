<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'uid', 'actif', 'date_expiration'])]
class BadgeRfid extends Model
{
    protected $table = 'badges_rfid';

    protected function casts(): array
    {
        return [
            'actif' => 'boolean',
            'date_expiration' => 'date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
