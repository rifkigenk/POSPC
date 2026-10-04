<?php

use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->admin = User::query()->where('email', 'admin@putricollection.com')->firstOrFail();
});

test('admin dashboard returns boutique metrics', function () {
    $this->actingAs($this->admin)->getJson('/api/pos/dashboard')->assertOk()->assertJsonStructure([
        'metrics' => ['today_revenue', 'today_transactions', 'today_profit', 'total_products', 'total_stock', 'low_stock_count'],
        'trend', 'low_stock', 'recent_sales', 'top_products',
    ]);
});

test('sale records selected color and atomically reduces its stock', function () {
    $product = Product::query()->with('variants')->firstOrFail();
    $variant = $product->variants->firstOrFail();
    $inventory = Inventory::query()->where('product_variant_id', $variant->id)->firstOrFail();
    $before = (float) $inventory->quantity;

    $response = $this->actingAs($this->admin)->postJson('/api/pos/sales', [
        'items' => [['product_id' => $product->id, 'product_variant_id' => $variant->id, 'quantity' => 2]],
        'payments' => [['method' => 'cash', 'amount' => (float) $product->selling_price * 2]],
    ])->assertCreated()->assertJsonPath('items.0.color', $variant->color);

    expect((float) $inventory->fresh()->quantity)->toBe($before - 2);
    $this->assertDatabaseHas('stock_movements', ['reference_id' => $response->json('id'), 'product_variant_id' => $variant->id, 'type' => 'sale']);
});

test('suspended transaction keeps stock unchanged', function () {
    $cashier = User::query()->where('email', 'kasir@putricollection.com')->firstOrFail();
    $product = Product::query()->with('variants')->firstOrFail();
    $variant = $product->variants->firstOrFail();
    $inventory = Inventory::query()->where('product_variant_id', $variant->id)->firstOrFail();
    $before = (float) $inventory->quantity;

    $this->actingAs($cashier)->postJson('/api/pos/suspended-transactions', [
        'name' => 'Pesanan Bu Siti',
        'items' => [['product_id' => $product->id, 'product_variant_id' => $variant->id, 'quantity' => 1]],
    ])->assertCreated()->assertJsonPath('name', 'Pesanan Bu Siti');

    expect((float) $inventory->fresh()->quantity)->toBe($before);
    $this->assertDatabaseHas('suspended_transactions', ['user_id' => $cashier->id, 'status' => 'pending']);
});

test('admin stock opname updates product color stock and records difference', function () {
    $inventory = Inventory::query()->whereNotNull('product_variant_id')->firstOrFail();
    $physical = (float) $inventory->quantity + 3;

    $this->actingAs($this->admin)->postJson('/api/pos/stock-opnames', [
        'opname_date' => now()->toDateString(),
        'items' => [[
            'product_id' => $inventory->product_id,
            'product_variant_id' => $inventory->product_variant_id,
            'physical_stock' => $physical,
            'notes' => 'Barang ditemukan di rak display',
        ]],
    ])->assertCreated()->assertJsonPath('details.0.status', 'surplus');

    expect((float) $inventory->fresh()->quantity)->toBe($physical);
});

test('cashier has private sales and cannot access admin endpoints', function () {
    $cashier = User::query()->where('email', 'kasir@putricollection.com')->firstOrFail();
    $catalogue = $this->actingAs($cashier)->getJson('/api/pos/products')->assertOk();
    expect($catalogue->json('data.0'))->not->toHaveKey('cost_price');

    $this->actingAs($cashier)->postJson('/api/pos/products', [])->assertForbidden();
    $this->actingAs($cashier)->postJson('/api/pos/customers', [])->assertForbidden();
    $this->actingAs($cashier)->postJson('/api/pos/categories', [])->assertForbidden();
    $this->actingAs($cashier)->getJson('/api/pos/reports')->assertForbidden();
    $this->actingAs($cashier)->getJson('/api/pos/stock-opnames')->assertForbidden();
    $this->actingAs($cashier)->getJson('/api/pos/users')->assertForbidden();
});

test('admin can create a product with color options', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/pos/products', [
        'name' => 'Abaya Hana', 'sku' => 'PC-ABY-001', 'cost_price' => 200000, 'selling_price' => 329000, 'min_stock' => 2,
        'variants' => [
            ['color' => 'Hitam', 'stock' => 5],
            ['color' => 'Mocca', 'stock' => 4],
        ],
    ])->assertCreated()->assertJsonCount(2, 'variants');

    $this->assertDatabaseHas('product_variants', ['product_id' => $response->json('id'), 'size' => 'Produk', 'color' => 'Hitam']);
});

test('admin can manage clothing categories', function () {
    $category = $this->actingAs($this->admin)->postJson('/api/pos/categories', [
        'name' => 'Khimar', 'color' => '#9c6075',
    ])->assertCreated()->json();

    $this->actingAs($this->admin)->putJson("/api/pos/categories/{$category['id']}", [
        'name' => 'Khimar Premium', 'color' => '#7d4b60',
    ])->assertOk()->assertJsonPath('name', 'Khimar Premium');

    $this->actingAs($this->admin)->deleteJson("/api/pos/categories/{$category['id']}")->assertOk();
});

test('admin can upload a safe product image', function () {
    Storage::fake('public');
    $product = Product::query()->firstOrFail();
    $this->actingAs($this->admin)->postJson("/api/pos/products/{$product->id}/image", [
        'image' => UploadedFile::fake()->createWithContent('gamis.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')),
    ])->assertOk()->assertJsonPath('message', 'Gambar produk berhasil disimpan.');
});

test('admin can create a cashier account', function () {
    $this->actingAs($this->admin)->postJson('/api/pos/users', [
        'name' => 'Kasir Kedua', 'email' => 'kasir2@putricollection.com', 'password' => 'password',
        'role' => 'cashier', 'outlet_id' => $this->admin->outlet_id,
    ])->assertCreated()->assertJsonPath('role', 'cashier');
});
