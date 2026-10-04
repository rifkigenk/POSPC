<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockOpname extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['opname_date' => 'date'];
    }

    /** @return HasMany<StockOpnameDetail, $this> */
    public function details(): HasMany
    {
        return $this->hasMany(StockOpnameDetail::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
