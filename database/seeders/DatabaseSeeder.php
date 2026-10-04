<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $now = now();
            $outletId = DB::table('outlets')->insertGetId([
                'code' => 'PUTRI-001', 'name' => 'Putri Collection', 'phone' => '0812-3456-7890',
                'address' => 'Jl. Melati No. 25', 'city' => 'Jakarta',
                'receipt_footer' => 'Terima kasih telah berbelanja. Penukaran barang maksimal 7 hari dengan tag dan struk asli.',
                'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);

            $admin = User::query()->create([
                'name' => 'Admin Putri Collection', 'email' => 'admin@putricollection.com',
                'email_verified_at' => $now, 'password' => Hash::make('password'),
            ]);
            $admin->forceFill(['outlet_id' => $outletId, 'role' => 'admin', 'is_active' => true])->save();

            $cashier = User::query()->create([
                'name' => 'Kasir Putri Collection', 'email' => 'kasir@putricollection.com',
                'email_verified_at' => $now, 'password' => Hash::make('password'),
            ]);
            $cashier->forceFill(['outlet_id' => $outletId, 'role' => 'cashier', 'is_active' => true])->save();

            $categories = [];
            foreach ([
                ['Gamis', '#45574f', 'sparkles'], ['Jilbab & Pashmina', '#71847b', 'layers'],
                ['Tunik', '#89978f', 'box'], ['Mukena', '#9ca9a2', 'sparkles'],
                ['Abaya', '#30443b', 'box'], ['Koko', '#5f7169', 'users'],
                ['Inner & Ciput', '#82938a', 'layers'], ['Aksesoris Muslimah', '#a99b89', 'sparkles'],
            ] as [$name, $color, $icon]) {
                $categories[$name] = DB::table('categories')->insertGetId(compact('name', 'color', 'icon') + ['is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
            }

            $unitId = DB::table('units')->insertGetId(['name' => 'Potong', 'short_name' => 'pcs', 'created_at' => $now, 'updated_at' => $now]);
            $catalogue = [
                ['Gamis Aisyah', 'PC-GMS-001', 'Gamis', 185000, 299000, 3, 'Gamis premium berbahan ceruty babydoll, jatuh dan nyaman dipakai.', 'gamis-aisyah.webp', [['Hitam', 13], ['Mocca', 11]]],
                ['Gamis Syari Zahra', 'PC-GMS-002', 'Gamis', 225000, 359000, 3, 'Set gamis syari dan khimar dengan detail renda lembut.', 'gamis-zahra.webp', [['Dusty Pink', 12], ['Navy', 5]]],
                ['Jilbab Pashmina Ceruty', 'PC-JLB-001', 'Jilbab & Pashmina', 32000, 59000, 8, 'Pashmina ceruty premium, ringan dan mudah dibentuk.', 'pashmina-ceruty.webp', [['Milo', 20], ['Hitam', 25], ['Sage', 14]]],
                ['Jilbab Instan Maryam', 'PC-JLB-002', 'Jilbab & Pashmina', 48000, 89000, 6, 'Jilbab instan dua layer untuk tampilan rapi sehari-hari.', 'jilbab-maryam.webp', [['Navy', 18], ['Maroon', 7]]],
                ['Tunik Aluna', 'PC-TNK-001', 'Tunik', 135000, 229000, 3, 'Tunik modest modern dengan potongan A-line dan bahan adem.', 'tunik-aluna.webp', [['Broken White', 13], ['Sage', 11]]],
                ['Mukena Travel Premium', 'PC-MKN-001', 'Mukena', 165000, 275000, 3, 'Mukena travel parasut premium lengkap dengan pouch ringkas.', 'mukena-travel.webp', [['Lavender', 8], ['Champagne', 9], ['Sky Blue', 6]]],
                ['Koko Al-Fatih', 'PC-KKO-001', 'Koko', 125000, 219000, 3, 'Baju koko modern dengan bordir minimalis dan bahan katun.', 'koko-alfatih.webp', [['Putih', 16], ['Hitam', 5], ['Navy', 3]]],
                ['Inner Ninja Premium', 'PC-INR-001', 'Inner & Ciput', 18000, 35000, 10, 'Inner ninja rayon premium yang elastis, adem, dan tidak menerawang.', 'inner-ninja.webp', [['Hitam', 30], ['Mocca', 18], ['Cream', 16]]],
            ];

            $products = [];
            $barcode = 899740120000;
            foreach ($catalogue as [$name, $sku, $category, $cost, $price, $minimum, $description, $image, $variants]) {
                $productId = DB::table('products')->insertGetId([
                    'category_id' => DB::table('categories')->where('name', $category)->value('id'), 'unit_id' => $unitId, 'sku' => $sku,
                    'barcode' => (string) ++$barcode, 'name' => $name, 'description' => $description,
                    'cost_price' => $cost, 'selling_price' => $price, 'min_stock' => $minimum,
                    'track_stock' => true, 'is_active' => true, 'image' => '/images/products/'.$image,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
                $products[$sku] = ['id' => $productId, 'name' => $name, 'cost' => $cost, 'price' => $price];
                foreach ($variants as $index => [$color, $stock]) {
                    $variantSku = $sku.'-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
                    $variantId = DB::table('product_variants')->insertGetId([
                        'product_id' => $productId, 'name' => $color, 'size' => 'Produk', 'color' => $color,
                        'sku' => $variantSku, 'barcode' => (string) ++$barcode, 'additional_price' => 0,
                        'cost_price' => $cost, 'selling_price' => $price, 'min_stock' => $minimum,
                        'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
                    ]);
                    DB::table('inventories')->insert([
                        'outlet_id' => $outletId, 'product_id' => $productId, 'product_variant_id' => $variantId,
                        'quantity' => $stock, 'reserved_quantity' => 0, 'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }

            $customers = [];
            foreach ([['CUS-0001', 'Siti Rahma', '081234567801'], ['CUS-0002', 'Aulia Putri', '081234567802'], ['CUS-0003', 'Nur Aisyah', '081234567803']] as [$code, $name, $phone]) {
                $customers[] = DB::table('customers')->insertGetId([
                    'code' => $code, 'name' => $name, 'phone' => $phone, 'member_tier' => 'Regular',
                    'points' => 0, 'credit_limit' => 0, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
                ]);
            }

            DB::table('suppliers')->insert([
                ['code' => 'SUP-001', 'name' => 'Amanah Modest Wear', 'contact_person' => 'Ibu Hana', 'phone' => '081300000001', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['code' => 'SUP-002', 'name' => 'Berkah Hijab Textile', 'contact_person' => 'Ibu Rina', 'phone' => '081300000002', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ]);

            $registerId = DB::table('cash_registers')->insertGetId(['outlet_id' => $outletId, 'code' => 'REG-01', 'name' => 'Kasir Utama', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
            DB::table('shifts')->insert(['cash_register_id' => $registerId, 'user_id' => $cashier->id, 'opened_at' => now()->startOfDay()->addHours(8), 'opening_cash' => 300000, 'expected_cash' => 300000, 'status' => 'open', 'created_at' => $now, 'updated_at' => $now]);

            // Riwayat singkat membuat dashboard langsung bermakna setelah seeding.
            $productList = array_values($products);
            foreach (range(6, 0) as $day) {
                $product = $productList[$day % count($productList)];
                $soldAt = now()->subDays($day)->setTime(10 + ($day % 7), 15);
                $saleId = DB::table('sales')->insertGetId([
                    'outlet_id' => $outletId, 'customer_id' => $customers[$day % count($customers)], 'user_id' => $cashier->id,
                    'invoice_number' => 'PC/'.$soldAt->format('Ymd').'/'.str_pad((string) ($day + 1), 4, '0', STR_PAD_LEFT),
                    'sold_at' => $soldAt, 'subtotal' => $product['price'], 'discount_amount' => 0, 'tax_amount' => 0,
                    'service_charge' => 0, 'grand_total' => $product['price'], 'paid_amount' => $product['price'],
                    'change_amount' => 0, 'points_earned' => 0, 'points_redeemed' => 0, 'status' => 'completed',
                    'order_type' => 'takeaway', 'created_at' => $soldAt, 'updated_at' => $soldAt,
                ]);
                $variant = DB::table('product_variants')->where('product_id', $product['id'])->first();
                DB::table('sale_items')->insert([
                    'sale_id' => $saleId, 'product_id' => $product['id'], 'product_variant_id' => $variant->id,
                    'product_name' => $product['name'], 'sku' => $variant->sku, 'size' => null, 'color' => $variant->color,
                    'quantity' => 1, 'unit_price' => $product['price'], 'cost_price' => $product['cost'],
                    'discount_amount' => 0, 'tax_amount' => 0, 'total' => $product['price'], 'created_at' => $soldAt, 'updated_at' => $soldAt,
                ]);
                DB::table('payments')->insert(['sale_id' => $saleId, 'method' => ['cash', 'qris', 'transfer'][$day % 3], 'amount' => $product['price'], 'status' => 'paid', 'created_at' => $soldAt, 'updated_at' => $soldAt]);
            }

            DB::table('settings')->insert([
                ['outlet_id' => null, 'key' => 'business_name', 'value' => 'Putri Collection', 'type' => 'string', 'created_at' => $now, 'updated_at' => $now],
                ['outlet_id' => null, 'key' => 'receipt_width', 'value' => '80mm', 'type' => 'string', 'created_at' => $now, 'updated_at' => $now],
                ['outlet_id' => null, 'key' => 'whatsapp', 'value' => '0812-3456-7890', 'type' => 'string', 'created_at' => $now, 'updated_at' => $now],
            ]);
        });
    }
}
