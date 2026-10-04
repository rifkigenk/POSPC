<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $groups = DB::table('product_variants')
                ->where('is_active', true)
                ->orderBy('id')
                ->get()
                ->groupBy(fn (object $variant): string => $variant->product_id.'|'.$variant->color);

            foreach ($groups as $group) {
                $primary = $group->firstWhere('size', 'Produk') ?? $group->first();
                $variantIds = $group->pluck('id');
                $stocks = DB::table('inventories')->whereIn('product_variant_id', $variantIds)->get()->groupBy('outlet_id');

                foreach ($stocks as $outletId => $rows) {
                    DB::table('inventories')->updateOrInsert([
                        'outlet_id' => $outletId,
                        'product_id' => $primary->product_id,
                        'product_variant_id' => $primary->id,
                    ], [
                        'quantity' => $rows->sum('quantity'),
                        'reserved_quantity' => $rows->sum('reserved_quantity'),
                        'updated_at' => now(),
                        'created_at' => $rows->first()->created_at,
                    ]);
                }

                DB::table('product_variants')->where('id', $primary->id)->update([
                    'name' => $primary->color,
                    'size' => 'Produk',
                    'updated_at' => now(),
                ]);

                $duplicateIds = $variantIds->reject(fn (int $id): bool => $id === $primary->id)->values();
                if ($duplicateIds->isEmpty()) {
                    continue;
                }

                DB::table('inventories')->whereIn('product_variant_id', $duplicateIds)->update([
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'updated_at' => now(),
                ]);
                DB::table('product_variants')->whereIn('id', $duplicateIds)->update([
                    'is_active' => false,
                    'updated_at' => now(),
                ]);
            }

            $inactive = DB::table('product_variants')->where('is_active', false)->get();
            foreach ($inactive as $old) {
                $active = DB::table('product_variants')
                    ->where('product_id', $old->product_id)
                    ->where('color', $old->color)
                    ->where('is_active', true)
                    ->first();

                if (! $active) {
                    continue;
                }

                DB::table('sale_items')->where('product_variant_id', $old->id)->update([
                    'product_variant_id' => $active->id,
                    'sku' => $active->sku,
                    'size' => null,
                    'color' => $active->color,
                ]);
                DB::table('suspended_transaction_details')->where('product_variant_id', $old->id)->update([
                    'product_variant_id' => $active->id,
                    'sku' => $active->sku,
                    'size' => 'Produk',
                    'color' => $active->color,
                ]);
                DB::table('stock_movements')->where('product_variant_id', $old->id)->update(['product_variant_id' => $active->id]);
                DB::table('stock_opname_details')->where('product_variant_id', $old->id)->update(['product_variant_id' => $active->id]);
            }

            DB::table('sale_items')->update(['size' => null]);
            DB::table('suspended_transaction_details')->update(['size' => 'Produk']);
        });
    }

    public function down(): void
    {
        // Data ukuran yang sudah digabung tidak dapat dipisahkan kembali secara akurat.
    }
};
