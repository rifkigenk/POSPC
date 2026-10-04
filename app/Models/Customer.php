<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['birth_date' => 'date', 'is_active' => 'boolean', 'credit_limit' => 'decimal:2'];
    }
}
