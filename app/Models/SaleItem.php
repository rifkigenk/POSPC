<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $sale_id
 * @property int|null $product_id
 * @property string $quantity
 */
class SaleItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:3', 'unit_price' => 'decimal:2', 'total' => 'decimal:2'];
    }
}
