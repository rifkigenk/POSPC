<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SuspendedTransaction extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['suspended_at' => 'datetime', 'subtotal' => 'decimal:2', 'discount_amount' => 'decimal:2', 'grand_total' => 'decimal:2'];
    }

    /** @return HasMany<SuspendedTransactionDetail, $this> */
    public function details(): HasMany
    {
        return $this->hasMany(SuspendedTransactionDetail::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
