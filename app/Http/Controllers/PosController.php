<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\StockOpname;
use App\Models\Supplier;
use App\Models\SuspendedTransaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PosController extends Controller
{
    public function bootstrap(Request $request): JsonResponse
    {
        $outletId = $this->outletId($request);
        $role = $request->user()->role;
        $permissions = [
            'sell' => true,
            'view_sales' => true,
            'manage_customers' => true,
            'manage_products' => $role === 'admin',
            'manage_inventory' => $role === 'admin',
            'manage_purchases' => $role === 'admin',
            'manage_finance' => $role === 'admin',
            'view_reports' => $role === 'admin',
            'manage_users' => $role === 'admin',
            'manage_settings' => $role === 'admin',
            'void_sales' => $role === 'admin',
        ];

        return response()->json([
            'user' => $request->user()->only(['id', 'name', 'email', 'role', 'outlet_id']),
            'permissions' => $permissions,
            'outlet' => DB::table('outlets')->find($outletId),
            'outlets' => DB::table('outlets')->where('is_active', true)->orderBy('name')->get(),
            'categories' => Category::query()->where('is_active', true)->orderBy('name')->get(),
            'units' => DB::table('units')->orderBy('name')->get(),
            'customers' => Customer::query()->where('is_active', true)->latest()->limit(100)->get(),
            'suppliers' => $role === 'admin' ? Supplier::query()->where('is_active', true)->orderBy('name')->get() : [],
            'settings' => DB::table('settings')->where(fn ($query) => $query
                ->whereNull('outlet_id')->orWhere('outlet_id', $outletId))
                ->pluck('value', 'key'),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $outletId = $this->outletId($request);
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth();
        $todaySales = Sale::query()->where('outlet_id', $outletId)->where('status', 'completed')
            ->whereDate('sold_at', $today);
        $monthSales = Sale::query()->where('outlet_id', $outletId)->where('status', 'completed')
            ->where('sold_at', '>=', $monthStart);

        if ($request->user()->role === 'cashier') {
            $todaySales->where('user_id', $request->user()->id);
            $monthSales->where('user_id', $request->user()->id);
        }

        $stockValue = DB::table('inventories')
            ->join('products', 'products.id', '=', 'inventories.product_id')
            ->where('inventories.outlet_id', $outletId)
            ->sum(DB::raw('inventories.quantity * products.cost_price'));

        $lowStock = Product::query()
            ->select('products.*', DB::raw('COALESCE(inventories.quantity, 0) as stock'))
            ->leftJoin('inventories', function ($join) use ($outletId) {
                $join->on('inventories.product_id', '=', 'products.id')
                    ->where('inventories.outlet_id', $outletId);
            })
            ->where('products.track_stock', true)
            ->whereColumn(DB::raw('COALESCE(inventories.quantity, 0)'), '<=', 'products.min_stock')
            ->orderBy('stock')->limit(6)->get();

        $recentSales = Sale::query()->with(['customer:id,name', 'user:id,name'])
            ->where('outlet_id', $outletId)
            ->when($request->user()->role === 'cashier', fn ($query) => $query->where('user_id', $request->user()->id))
            ->latest('sold_at')->limit(7)->get();

        if ($request->user()->role === 'cashier') {
            return response()->json([
                'metrics' => [
                    'today_revenue' => (float) (clone $todaySales)->sum('grand_total'),
                    'today_transactions' => (clone $todaySales)->count(),
                    'suspended_count' => SuspendedTransaction::query()->where('status', 'pending')
                        ->where('user_id', $request->user()->id)->count(),
                ],
                'recent_sales' => $recentSales,
            ]);
        }

        $salesByDay = Sale::query()->where('outlet_id', $outletId)->where('status', 'completed')
            ->where('sold_at', '>=', now()->subDays(6)->startOfDay())->get(['sold_at', 'grand_total'])
            ->groupBy(fn (Sale $sale) => $sale->sold_at->toDateString())
            ->map(fn ($rows) => (float) $rows->sum('grand_total'));

        $trend = collect(range(6, 0))->map(function (int $daysAgo) use ($salesByDay) {
            $date = now()->subDays($daysAgo);

            return [
                'date' => $date->toDateString(),
                'label' => $date->translatedFormat('D'),
                'value' => $salesByDay->get($date->toDateString(), 0),
            ];
        });

        $topProducts = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.outlet_id', $outletId)->where('sales.status', 'completed')
            ->where('sales.sold_at', '>=', $monthStart)
            ->select('sale_items.product_name', DB::raw('SUM(sale_items.quantity) as quantity'), DB::raw('SUM(sale_items.total) as revenue'))
            ->groupBy('sale_items.product_name')->orderByDesc('revenue')->limit(5)->get();

        return response()->json([
            'metrics' => [
                'today_revenue' => (float) (clone $todaySales)->sum('grand_total'),
                'today_transactions' => (clone $todaySales)->count(),
                'today_profit' => (float) DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                    ->where('sales.outlet_id', $outletId)->where('sales.status', 'completed')->whereDate('sales.sold_at', $today)
                    ->when($request->user()->role === 'cashier', fn ($query) => $query->where('sales.user_id', $request->user()->id))
                    ->sum(DB::raw('sale_items.total - (sale_items.cost_price * sale_items.quantity)')),
                'month_revenue' => (float) (clone $monthSales)->sum('grand_total'),
                'month_profit' => (float) DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                    ->where('sales.outlet_id', $outletId)->where('sales.status', 'completed')
                    ->where('sales.sold_at', '>=', $monthStart)
                    ->sum(DB::raw('sale_items.total - (sale_items.cost_price * sale_items.quantity)')),
                'stock_value' => (float) $stockValue,
                'low_stock_count' => $lowStock->count(),
                'customer_count' => Customer::query()->where('is_active', true)->count(),
                'total_products' => Product::query()->where('is_active', true)->count(),
                'total_stock' => (float) DB::table('inventories')->where('outlet_id', $outletId)->sum('quantity'),
                'suspended_count' => SuspendedTransaction::query()->where('status', 'pending')
                    ->when($request->user()->role === 'cashier', fn ($query) => $query->where('user_id', $request->user()->id))->count(),
            ],
            'trend' => $trend,
            'low_stock' => $lowStock,
            'recent_sales' => $recentSales,
            'top_products' => $topProducts,
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $outletId = $this->outletId($request);
        $query = Product::query()->with('category:id,name,color')
            ->with(['variants' => fn ($query) => $query->where('is_active', true)->withSum(['inventories as stock' => fn ($q) => $q->where('outlet_id', $outletId)], 'quantity')])
            ->withSum(['inventories as stock' => fn ($q) => $q->where('outlet_id', $outletId)], 'quantity');

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")->orWhere('barcode', 'like', "%{$search}%")
                ->orWhereHas('category', fn ($category) => $category->where('name', 'like', "%{$search}%"))
                ->orWhereHas('variants', fn ($variant) => $variant->where('color', 'like', "%{$search}%")));
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }
        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        $products = $query->orderBy('name')->paginate(min($request->integer('per_page', 100), 200));
        if ($request->user()->role === 'cashier') {
            $products->getCollection()->each(function (Product $product): void {
                $product->makeHidden(['cost_price', 'wholesale_price']);
                $product->variants->each->makeHidden('cost_price');
            });
        }

        return response()->json($products);
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:60', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:80', 'unique:products,barcode'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'unit_id' => ['nullable', 'exists:units,id'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'initial_stock' => ['nullable', 'numeric', 'min:0'],
            'track_stock' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string'],
            'variants' => ['nullable', 'array'],
            'variants.*.color' => ['required_with:variants', 'string', 'max:60'],
            'variants.*.stock' => ['required_with:variants', 'numeric', 'min:0'],
        ]);

        $product = DB::transaction(function () use ($data, $request) {
            $initialStock = (float) ($data['initial_stock'] ?? 0);
            $variants = $data['variants'] ?? [];
            unset($data['initial_stock'], $data['variants']);
            $product = Product::query()->create($data);
            if ($variants === []) {
                $variants = [['color' => 'Default', 'stock' => $initialStock]];
            }
            foreach ($variants as $index => $variantData) {
                $variant = $product->variants()->create([
                    'name' => $variantData['color'],
                    'size' => 'Produk', 'color' => $variantData['color'],
                    'sku' => $product->sku.'-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                    'cost_price' => $product->cost_price, 'selling_price' => $product->selling_price,
                    'min_stock' => $product->min_stock, 'is_active' => true,
                ]);
                Inventory::query()->create([
                    'outlet_id' => $this->outletId($request), 'product_id' => $product->id,
                    'product_variant_id' => $variant->id, 'quantity' => $variantData['stock'],
                ]);
            }

            return $product;
        });

        return response()->json($product->load(['category', 'variants']), 201);
    }

    public function updateProduct(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'sku' => ['sometimes', 'required', 'string', 'max:60', Rule::unique('products')->ignore($product)],
            'barcode' => ['nullable', 'string', 'max:80', Rule::unique('products')->ignore($product)],
            'category_id' => ['nullable', 'exists:categories,id'],
            'unit_id' => ['nullable', 'exists:units,id'],
            'cost_price' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'numeric', 'min:0'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'min_stock' => ['sometimes', 'numeric', 'min:0'],
            'track_stock' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'exists:product_variants,id'],
            'variants.*.color' => ['required_with:variants', 'string', 'max:60'],
            'variants.*.stock' => ['nullable', 'numeric', 'min:0'],
        ]);
        $variants = $data['variants'] ?? null;
        unset($data['variants']);
        DB::transaction(function () use ($product, $data, $variants, $request): void {
            $product->update($data);
            if ($variants !== null) {
                foreach ($variants as $index => $variantData) {
                    $variant = isset($variantData['id'])
                        ? ProductVariant::query()->where('product_id', $product->id)->findOrFail((int) $variantData['id'])
                        : $product->variants()->create([
                            'name' => $variantData['color'],
                            'size' => 'Produk', 'color' => $variantData['color'],
                            'sku' => $product->sku.'-'.str_pad((string) ($product->variants()->count() + $index + 1), 2, '0', STR_PAD_LEFT),
                            'is_active' => true,
                        ]);
                    $variant->update([
                        'name' => $variantData['color'], 'size' => 'Produk',
                        'color' => $variantData['color'], 'cost_price' => $product->cost_price,
                        'selling_price' => $product->selling_price, 'min_stock' => $product->min_stock,
                    ]);
                    if (array_key_exists('stock', $variantData)) {
                        Inventory::query()->updateOrCreate([
                            'outlet_id' => $this->outletId($request), 'product_id' => $product->id,
                            'product_variant_id' => $variant->id,
                        ], ['quantity' => $variantData['stock']]);
                    }
                }
            }
        });

        return response()->json($product->fresh()->load(['category', 'variants']));
    }

    public function destroyProduct(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Produk berhasil diarsipkan.']);
    }

    public function uploadProductImage(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ]);

        if ($product->image && str_starts_with($product->image, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $product->image));
        }

        $path = $request->file('image')->store('products', 'public');
        $product->update(['image' => '/storage/'.$path]);

        return response()->json([
            'message' => 'Gambar produk berhasil disimpan.',
            'image' => $product->image,
            'product' => $product->fresh('category'),
        ]);
    }

    public function generateBarcode(): JsonResponse
    {
        do {
            $base = '899'.str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
            $barcode = $base.$this->ean13CheckDigit($base);
        } while (Product::withTrashed()->where('barcode', $barcode)->exists());

        return response()->json([
            'barcode' => $barcode,
            'format' => 'EAN13',
            'sku_suggestion' => 'PC-'.now()->format('ymd').'-'.strtoupper(str()->random(4)),
        ]);
    }

    public function adjustStock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'product_variant_id' => ['required', 'exists:product_variants,id'],
            'quantity' => ['required', 'numeric', 'not_in:0'],
            'type' => ['required', Rule::in(['adjustment', 'stock_in', 'stock_out', 'damaged', 'transfer'])],
            'notes' => ['required', 'string', 'max:500'],
        ]);

        $inventory = DB::transaction(function () use ($data, $request) {
            $inventory = Inventory::query()->where('outlet_id', $this->outletId($request))
                ->where('product_id', $data['product_id'])->where('product_variant_id', $data['product_variant_id'])->lockForUpdate()->first();
            if (! $inventory) {
                $inventory = Inventory::query()->create([
                    'outlet_id' => $this->outletId($request), 'product_id' => $data['product_id'],
                    'product_variant_id' => $data['product_variant_id'], 'quantity' => 0,
                ]);
            }
            $before = (float) $inventory->quantity;
            $after = $before + (float) $data['quantity'];
            if ($after < 0) {
                throw ValidationException::withMessages(['quantity' => 'Stok tidak boleh menjadi negatif.']);
            }
            $inventory->update(['quantity' => $after]);
            $this->recordStockMovement($request, $data['product_id'], $data['type'], (float) $data['quantity'], $before, $after, null, $data['notes'], $data['product_variant_id']);

            return $inventory;
        });

        return response()->json($inventory->load('product'));
    }

    public function customers(Request $request): JsonResponse
    {
        $query = Customer::query();
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"));
        }

        return response()->json($query->latest()->paginate(100));
    }

    public function storeCustomer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'], 'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email'], 'address' => ['nullable', 'string'],
            'birth_date' => ['nullable', 'date'], 'member_tier' => ['nullable', Rule::in(['Regular', 'Silver', 'Gold', 'Platinum'])],
        ]);
        $data['code'] = 'CUS-'.now()->format('ymd').'-'.str_pad((string) (Customer::query()->count() + 1), 4, '0', STR_PAD_LEFT);

        return response()->json(Customer::query()->create($data), 201);
    }

    public function suppliers(Request $request): JsonResponse
    {
        return response()->json(Supplier::query()->latest()->paginate(100));
    }

    public function storeSupplier(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'], 'contact_person' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:30'], 'email' => ['nullable', 'email'], 'address' => ['nullable', 'string'],
        ]);
        $data['code'] = 'SUP-'.str_pad((string) (Supplier::query()->count() + 1), 4, '0', STR_PAD_LEFT);

        return response()->json(Supplier::query()->create($data), 201);
    }

    public function sales(Request $request): JsonResponse
    {
        $query = Sale::query()->with(['customer:id,name', 'user:id,name', 'items', 'payments'])
            ->where('outlet_id', $this->outletId($request));
        if ($request->user()->role === 'cashier') {
            $query->where('user_id', $request->user()->id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('from')) {
            $query->whereDate('sold_at', '>=', $request->date('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('sold_at', '<=', $request->date('to'));
        }
        if ($request->filled('cashier_id') && $request->user()->role === 'admin') {
            $query->where('user_id', $request->integer('cashier_id'));
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($q) => $q->where('invoice_number', 'like', "%{$search}%")
                ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', "%{$search}%")));
        }
        if ($request->filled('payment_method')) {
            $query->whereHas('payments', fn ($payment) => $payment->where('method', $request->string('payment_method')));
        }

        $sales = $query->latest('sold_at')->paginate(50);
        if ($request->user()->role === 'cashier') {
            $sales->getCollection()->each(function (Sale $sale): void {
                $sale->items->each->makeHidden('cost_price');
            });
        }

        return response()->json($sales);
    }

    public function storeSale(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.product_variant_id' => ['required', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'service_charge' => ['nullable', 'numeric', 'min:0'],
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.method' => ['required', Rule::in(['cash', 'qris', 'debit', 'credit', 'transfer', 'ewallet', 'credit_customer'])],
            'payments.*.amount' => ['required', 'numeric', 'gt:0'],
            'payments.*.reference_number' => ['nullable', 'string', 'max:100'],
            'order_type' => ['nullable', Rule::in(['takeaway', 'dine_in', 'delivery'])],
            'table_number' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $sale = DB::transaction(function () use ($data, $request) {
            $outletId = $this->outletId($request);
            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $product = Product::query()->lockForUpdate()->findOrFail((int) $item['product_id']);
                $variant = ProductVariant::query()->where('product_id', $product->id)->findOrFail((int) $item['product_variant_id']);
                $quantity = (float) $item['quantity'];
                $unitPrice = (float) ($variant->selling_price ?? $product->selling_price);
                $lineDiscount = min((float) ($item['discount_amount'] ?? 0), $unitPrice * $quantity);
                $lineTotal = ($unitPrice * $quantity) - $lineDiscount;

                if ($product->track_stock) {
                    $inventory = Inventory::query()->where('outlet_id', $outletId)->where('product_id', $product->id)
                        ->where('product_variant_id', $variant->id)->lockForUpdate()->first();
                    if (! $inventory || (float) $inventory->quantity < $quantity) {
                        throw ValidationException::withMessages(['items' => "Stok {$product->name} ({$variant->color}) tidak mencukupi."]);
                    }
                }

                $subtotal += $lineTotal;
            }

            $discount = min((float) ($data['discount_amount'] ?? 0), $subtotal);
            $tax = max(0, ($subtotal - $discount) * ((float) ($data['tax_percent'] ?? 0) / 100));
            $service = (float) ($data['service_charge'] ?? 0);
            $grandTotal = round($subtotal - $discount + $tax + $service, 2);
            $paid = 0.0;
            $creditPaid = 0.0;
            $hasCredit = false;
            foreach ($data['payments'] as $payment) {
                $paid += (float) $payment['amount'];
                if ($payment['method'] === 'credit_customer') {
                    $hasCredit = true;
                } else {
                    $creditPaid += (float) $payment['amount'];
                }
            }
            if ($paid < $grandTotal && ! $hasCredit) {
                throw ValidationException::withMessages(['payments' => 'Jumlah pembayaran kurang dari total transaksi.']);
            }
            if ($hasCredit && empty($data['customer_id'])) {
                throw ValidationException::withMessages(['customer_id' => 'Pelanggan wajib dipilih untuk transaksi piutang.']);
            }

            $points = ! empty($data['customer_id']) ? (int) floor($grandTotal / 10000) : 0;
            $sale = Sale::query()->create([
                'outlet_id' => $outletId,
                'shift_id' => DB::table('shifts')->where('user_id', $request->user()->id)->where('status', 'open')->value('id'),
                'customer_id' => $data['customer_id'] ?? null,
                'user_id' => $request->user()->id,
                'invoice_number' => 'PC/'.now()->format('Ymd').'/'.strtoupper(str()->random(5)),
                'sold_at' => now(), 'subtotal' => $subtotal, 'discount_amount' => $discount,
                'tax_amount' => $tax, 'service_charge' => $service, 'grand_total' => $grandTotal,
                'paid_amount' => $paid, 'change_amount' => max(0, $paid - $grandTotal),
                'points_earned' => $points, 'status' => 'completed',
                'order_type' => $data['order_type'] ?? 'takeaway', 'table_number' => $data['table_number'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $product = Product::query()->findOrFail((int) $item['product_id']);
                $variant = ProductVariant::query()->where('product_id', $product->id)->findOrFail((int) $item['product_variant_id']);
                $quantity = (float) $item['quantity'];
                $unitPrice = (float) ($variant->selling_price ?? $product->selling_price);
                $lineDiscount = min((float) ($item['discount_amount'] ?? 0), $unitPrice * $quantity);
                $lineTotal = ($unitPrice * $quantity) - $lineDiscount;
                $sale->items()->create([
                    'product_id' => $product->id, 'product_variant_id' => $variant->id,
                    'product_name' => $product->name, 'sku' => $variant->sku, 'size' => null, 'color' => $variant->color,
                    'quantity' => $quantity, 'unit_price' => $unitPrice, 'cost_price' => $variant->cost_price ?? $product->cost_price,
                    'discount_amount' => $lineDiscount, 'total' => $lineTotal, 'notes' => $item['notes'] ?? null,
                ]);
                if ($product->track_stock) {
                    $inventory = Inventory::query()->where('outlet_id', $outletId)->where('product_id', $product->id)
                        ->where('product_variant_id', $variant->id)->lockForUpdate()->firstOrFail();
                    $before = (float) $inventory->quantity;
                    $after = $before - $quantity;
                    $inventory->update(['quantity' => $after]);
                    $this->recordStockMovement($request, $product->id, 'sale', -$quantity, $before, $after, $sale, "Penjualan {$sale->invoice_number} · {$variant->color}", $variant->id);
                }
            }

            foreach ($data['payments'] as $payment) {
                $sale->payments()->create($payment + ['status' => 'paid']);
            }

            if ($sale->customer_id && $points > 0) {
                $customer = Customer::query()->lockForUpdate()->find((int) $sale->customer_id);
                if ($customer) {
                    $customer->increment('points', $points);
                    DB::table('loyalty_transactions')->insert([
                        'customer_id' => $customer->id, 'sale_id' => $sale->id, 'type' => 'earn', 'points' => $points,
                        'balance_after' => $customer->fresh()->points, 'description' => "Poin dari {$sale->invoice_number}",
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
            }

            if ($hasCredit) {
                DB::table('debts')->insert([
                    'outlet_id' => $outletId, 'customer_id' => $sale->customer_id, 'type' => 'receivable',
                    'reference_number' => $sale->invoice_number, 'total_amount' => $grandTotal,
                    'paid_amount' => $creditPaid,
                    'status' => 'open', 'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            return $sale;
        });

        return response()->json($this->receiptPayload($request, $sale), 201);
    }

    public function receipt(Request $request, Sale $sale): JsonResponse
    {
        abort_unless($sale->outlet_id === $this->outletId($request), 404, 'Transaksi tidak ditemukan.');
        abort_if($request->user()->role === 'cashier' && $sale->user_id !== $request->user()->id, 403, 'Kasir hanya dapat membuka struk miliknya sendiri.');

        return response()->json($this->receiptPayload($request, $sale));
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:categories,name'],
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);
        $category = Category::query()->create($data + ['icon' => 'sparkles', 'is_active' => true]);

        return response()->json($category, 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('categories')->ignore($category)],
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $category->update($data);

        return response()->json($category->fresh());
    }

    public function destroyCategory(Category $category): JsonResponse
    {
        if ($category->products()->exists()) {
            throw ValidationException::withMessages(['category' => 'Kategori masih digunakan produk dan tidak dapat dihapus.']);
        }
        $category->delete();

        return response()->json(['message' => 'Kategori berhasil dihapus.']);
    }

    public function voidSale(Request $request, Sale $sale): JsonResponse
    {
        $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']]);
        if ($sale->status !== 'completed') {
            throw ValidationException::withMessages(['sale' => 'Transaksi ini tidak dapat dibatalkan.']);
        }

        DB::transaction(function () use ($sale, $request) {
            $sale->load('items');
            foreach ($sale->items as $item) {
                if (! $item->product_id) {
                    continue;
                }
                $inventory = Inventory::query()->where('outlet_id', $sale->outlet_id)->where('product_id', $item->product_id)
                    ->where('product_variant_id', $item->product_variant_id)->lockForUpdate()->first();
                if ($inventory) {
                    $before = (float) $inventory->quantity;
                    $after = $before + (float) $item->quantity;
                    $inventory->update(['quantity' => $after]);
                    $this->recordStockMovement($request, $item->product_id, 'void', (float) $item->quantity, $before, $after, $sale, "Void {$sale->invoice_number}", $item->product_variant_id);
                }
            }
            $sale->update(['status' => 'void', 'notes' => trim(($sale->notes ? $sale->notes."\n" : '').'VOID: '.$request->string('reason'))]);
        });

        return response()->json(['message' => 'Transaksi dibatalkan dan stok dikembalikan.', 'sale' => $sale->fresh()]);
    }

    public function purchases(Request $request): JsonResponse
    {
        $rows = DB::table('purchases')->leftJoin('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->where('purchases.outlet_id', $this->outletId($request))
            ->select('purchases.*', 'suppliers.name as supplier_name')->latest('purchase_date')->paginate(50);

        return response()->json($rows);
    }

    public function storePurchase(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'], 'supplier_invoice' => ['nullable', 'string'],
            'purchase_date' => ['required', 'date'], 'due_date' => ['nullable', 'date'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'], 'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'], 'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'], 'items.*.cost_price' => ['required', 'numeric', 'min:0'],
        ]);

        $purchaseId = DB::transaction(function () use ($data, $request) {
            $outletId = $this->outletId($request);
            $total = 0.0;
            foreach ($data['items'] as $item) {
                $total += (float) $item['quantity'] * (float) $item['cost_price'];
            }
            $paid = min((float) ($data['paid_amount'] ?? 0), $total);
            $id = DB::table('purchases')->insertGetId([
                'outlet_id' => $outletId, 'supplier_id' => $data['supplier_id'], 'user_id' => $request->user()->id,
                'purchase_number' => 'PO/'.now()->format('ymd').'/'.strtoupper(str()->random(5)),
                'supplier_invoice' => $data['supplier_invoice'] ?? null, 'purchase_date' => $data['purchase_date'],
                'due_date' => $data['due_date'] ?? null, 'subtotal' => $total, 'grand_total' => $total, 'paid_amount' => $paid,
                'payment_status' => $paid >= $total ? 'paid' : ($paid > 0 ? 'partial' : 'unpaid'),
                'status' => 'received', 'notes' => $data['notes'] ?? null, 'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach ($data['items'] as $item) {
                DB::table('purchase_items')->insert([
                    'purchase_id' => $id, 'product_id' => $item['product_id'], 'quantity' => $item['quantity'],
                    'cost_price' => $item['cost_price'], 'total' => $item['quantity'] * $item['cost_price'],
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $inventory = Inventory::query()->firstOrCreate(['outlet_id' => $outletId, 'product_id' => $item['product_id']], ['quantity' => 0]);
                $before = (float) $inventory->quantity;
                $after = $before + (float) $item['quantity'];
                $inventory->update(['quantity' => $after]);
                Product::query()->whereKey($item['product_id'])->update(['cost_price' => $item['cost_price']]);
                $this->recordStockMovement($request, $item['product_id'], 'purchase', (float) $item['quantity'], $before, $after, null, 'Penerimaan pembelian');
            }
            if ($paid < $total) {
                DB::table('debts')->insert([
                    'outlet_id' => $outletId, 'supplier_id' => $data['supplier_id'], 'type' => 'payable',
                    'reference_number' => DB::table('purchases')->where('id', $id)->value('purchase_number'),
                    'total_amount' => $total, 'paid_amount' => $paid, 'due_date' => $data['due_date'] ?? null,
                    'status' => 'open', 'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            return $id;
        });

        return response()->json(DB::table('purchases')->find($purchaseId), 201);
    }

    public function expenses(Request $request): JsonResponse
    {
        return response()->json(DB::table('expenses')->where('outlet_id', $this->outletId($request))->latest('expense_date')->paginate(100));
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => ['required', 'string', 'max:80'], 'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0'], 'payment_method' => ['required', 'string', 'max:30'],
            'expense_date' => ['required', 'date'],
        ]);
        $id = DB::table('expenses')->insertGetId($data + [
            'outlet_id' => $this->outletId($request), 'user_id' => $request->user()->id,
            'expense_number' => 'EXP/'.now()->format('ymd').'/'.strtoupper(str()->random(5)),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json(DB::table('expenses')->find($id), 201);
    }

    public function reports(Request $request): JsonResponse
    {
        $validated = $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from']]);
        $from = Carbon::parse($validated['from'] ?? now()->startOfMonth())->startOfDay();
        $to = Carbon::parse($validated['to'] ?? now())->endOfDay();
        $outletId = $this->outletId($request);
        $sales = Sale::query()->where('outlet_id', $outletId)->where('status', 'completed')->whereBetween('sold_at', [$from, $to])->get();
        $expenses = (float) DB::table('expenses')->where('outlet_id', $outletId)->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])->sum('amount');
        $cogs = (float) DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.outlet_id', $outletId)->where('sales.status', 'completed')->whereBetween('sales.sold_at', [$from, $to])
            ->sum(DB::raw('sale_items.cost_price * sale_items.quantity'));
        $revenue = (float) $sales->sum('grand_total');

        $details = DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.outlet_id', $outletId)->where('sales.status', 'completed')->whereBetween('sales.sold_at', [$from, $to])
            ->select('sales.sold_at', 'sales.invoice_number', 'sale_items.product_name', 'sale_items.color',
                'sale_items.quantity', 'sale_items.cost_price', 'sale_items.unit_price', 'sale_items.discount_amount', 'sale_items.total',
                DB::raw('(sale_items.total - (sale_items.cost_price * sale_items.quantity)) as gross_profit'))
            ->latest('sales.sold_at')->limit(500)->get();
        $trend = DB::table('sales')->where('outlet_id', $outletId)->where('status', 'completed')->whereBetween('sold_at', [$from, $to])
            ->selectRaw('DATE(sold_at) as date, SUM(grand_total) as sales')->groupByRaw('DATE(sold_at)')->orderBy('date')->get();
        $profitByDay = DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.outlet_id', $outletId)->where('sales.status', 'completed')->whereBetween('sales.sold_at', [$from, $to])
            ->selectRaw('DATE(sales.sold_at) as date, SUM(sale_items.total - (sale_items.cost_price * sale_items.quantity)) as profit')
            ->groupByRaw('DATE(sales.sold_at)')->pluck('profit', 'date');

        return response()->json([
            'summary' => ['revenue' => $revenue, 'transactions' => $sales->count(), 'cogs' => $cogs, 'gross_profit' => $revenue - $cogs, 'expenses' => $expenses, 'net_profit' => $revenue - $cogs - $expenses, 'average_order' => $sales->count() ? $revenue / $sales->count() : 0],
            'payments' => DB::table('payments')->join('sales', 'sales.id', '=', 'payments.sale_id')->where('sales.outlet_id', $outletId)
                ->where('sales.status', 'completed')->whereBetween('sales.sold_at', [$from, $to])->select('payments.method', DB::raw('SUM(payments.amount) as total'))->groupBy('payments.method')->get(),
            'top_products' => DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')->where('sales.outlet_id', $outletId)
                ->where('sales.status', 'completed')->whereBetween('sales.sold_at', [$from, $to])->select('sale_items.product_name', DB::raw('SUM(sale_items.quantity) as quantity'), DB::raw('SUM(sale_items.total) as revenue'))->groupBy('sale_items.product_name')->orderByDesc('revenue')->limit(10)->get(),
            'details' => $details,
            'trend' => $trend->map(fn ($row) => ['date' => $row->date, 'sales' => (float) $row->sales, 'profit' => (float) ($profitByDay[$row->date] ?? 0)]),
            'total_discount' => (float) $sales->sum('discount_amount'),
        ]);
    }

    public function suspendedTransactions(Request $request): JsonResponse
    {
        $query = SuspendedTransaction::query()->with(['details', 'user:id,name', 'customer:id,name'])
            ->where('outlet_id', $this->outletId($request))->where('status', 'pending');
        if ($request->user()->role === 'cashier') {
            $query->where('user_id', $request->user()->id);
        }

        return response()->json($query->latest('suspended_at')->paginate(50));
    }

    public function storeSuspendedTransaction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'], 'notes' => ['nullable', 'string', 'max:1000'],
            'customer_id' => ['nullable', 'exists:customers,id'], 'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'], 'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.product_variant_id' => ['required', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'], 'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $suspended = DB::transaction(function () use ($data, $request) {
            $lines = [];
            $subtotal = 0.0;
            foreach ($data['items'] as $item) {
                $product = Product::query()->findOrFail((int) $item['product_id']);
                $variant = ProductVariant::query()->where('product_id', $product->id)->findOrFail((int) $item['product_variant_id']);
                $price = (float) ($variant->selling_price ?? $product->selling_price);
                $discount = min((float) ($item['discount_amount'] ?? 0), $price * $item['quantity']);
                $lineSubtotal = ($price * $item['quantity']) - $discount;
                $subtotal += $lineSubtotal;
                $lines[] = compact('product', 'variant', 'price', 'discount', 'lineSubtotal', 'item');
            }
            $discount = min((float) ($data['discount_amount'] ?? 0), $subtotal);
            $record = SuspendedTransaction::query()->create([
                'outlet_id' => $this->outletId($request), 'user_id' => $request->user()->id,
                'customer_id' => $data['customer_id'] ?? null, 'suspension_number' => 'TUNDA/'.now()->format('Ymd').'/'.strtoupper(str()->random(4)),
                'name' => $data['name'], 'notes' => $data['notes'] ?? null, 'subtotal' => $subtotal,
                'discount_amount' => $discount, 'grand_total' => $subtotal - $discount, 'status' => 'pending', 'suspended_at' => now(),
            ]);
            foreach ($lines as $line) {
                $record->details()->create([
                    'product_id' => $line['product']->id, 'product_variant_id' => $line['variant']->id,
                    'product_name' => $line['product']->name, 'sku' => $line['variant']->sku,
                    'size' => 'Produk', 'color' => $line['variant']->color,
                    'quantity' => $line['item']['quantity'], 'unit_price' => $line['price'],
                    'discount_amount' => $line['discount'], 'subtotal' => $line['lineSubtotal'],
                ]);
            }

            return $record;
        });

        return response()->json($suspended->load(['details', 'user:id,name', 'customer:id,name']), 201);
    }

    public function destroySuspendedTransaction(Request $request, SuspendedTransaction $suspendedTransaction): JsonResponse
    {
        abort_unless($request->user()->role === 'admin' || $suspendedTransaction->user_id === $request->user()->id, 403);
        $suspendedTransaction->delete();

        return response()->json(['message' => 'Transaksi tunda berhasil dihapus.']);
    }

    public function stockOpnames(Request $request): JsonResponse
    {
        $outletId = $this->outletId($request);
        $variants = DB::table('inventories')->join('products', 'products.id', '=', 'inventories.product_id')
            ->join('product_variants', 'product_variants.id', '=', 'inventories.product_variant_id')
            ->where('inventories.outlet_id', $outletId)
            ->select('products.id as product_id', 'products.name as product_name', 'products.image', 'product_variants.id as product_variant_id',
                'product_variants.sku', 'product_variants.color', 'inventories.quantity as system_stock')
            ->orderBy('products.name')->get();
        $history = StockOpname::query()->with(['details', 'user:id,name'])->where('outlet_id', $outletId)
            ->latest('opname_date')->paginate(30);

        return response()->json(['variants' => $variants, 'history' => $history]);
    }

    public function storeStockOpname(Request $request): JsonResponse
    {
        $data = $request->validate([
            'opname_date' => ['required', 'date'], 'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'], 'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.product_variant_id' => ['required', 'exists:product_variants,id'],
            'items.*.physical_stock' => ['required', 'numeric', 'min:0'], 'items.*.notes' => ['nullable', 'string', 'max:500'],
        ]);
        $opname = DB::transaction(function () use ($data, $request) {
            $outletId = $this->outletId($request);
            $record = StockOpname::query()->create([
                'outlet_id' => $outletId, 'user_id' => $request->user()->id,
                'opname_number' => 'SO/'.now()->format('Ymd').'/'.strtoupper(str()->random(4)),
                'opname_date' => $data['opname_date'], 'notes' => $data['notes'] ?? null,
            ]);
            foreach ($data['items'] as $item) {
                $inventory = Inventory::query()->where('outlet_id', $outletId)->where('product_id', $item['product_id'])
                    ->where('product_variant_id', $item['product_variant_id'])->lockForUpdate()->firstOrFail();
                $system = (float) $inventory->quantity;
                $physical = (float) $item['physical_stock'];
                $difference = $physical - $system;
                $status = $difference === 0.0 ? 'match' : ($difference > 0 ? 'surplus' : 'minus');
                $record->details()->create([
                    'product_id' => $item['product_id'], 'product_variant_id' => $item['product_variant_id'],
                    'system_stock' => $system, 'physical_stock' => $physical, 'difference' => $difference,
                    'status' => $status, 'notes' => $item['notes'] ?? null,
                ]);
                $inventory->update(['quantity' => $physical]);
                if ($difference !== 0.0) {
                    $this->recordStockMovement($request, $item['product_id'], 'stock_opname', $difference, $system, $physical, $record, $item['notes'] ?? 'Stok opname', $item['product_variant_id']);
                }
            }

            return $record;
        });

        return response()->json($opname->load(['details', 'user:id,name']), 201);
    }

    public function operations(Request $request): JsonResponse
    {
        $outletId = $this->outletId($request);

        return response()->json([
            'promotions' => DB::table('promotions')->latest()->get(),
            'debts' => DB::table('debts')
                ->leftJoin('customers', 'customers.id', '=', 'debts.customer_id')
                ->leftJoin('suppliers', 'suppliers.id', '=', 'debts.supplier_id')
                ->where('debts.outlet_id', $outletId)
                ->select('debts.*', 'customers.name as customer_name', 'suppliers.name as supplier_name')
                ->latest('debts.created_at')->get(),
            'stock_movements' => DB::table('stock_movements')
                ->join('products', 'products.id', '=', 'stock_movements.product_id')
                ->leftJoin('users', 'users.id', '=', 'stock_movements.user_id')
                ->where('stock_movements.outlet_id', $outletId)
                ->select('stock_movements.*', 'products.name as product_name', 'products.sku', 'users.name as user_name')
                ->latest('stock_movements.created_at')->limit(100)->get(),
            'shifts' => DB::table('shifts')
                ->join('cash_registers', 'cash_registers.id', '=', 'shifts.cash_register_id')
                ->join('users', 'users.id', '=', 'shifts.user_id')
                ->where('cash_registers.outlet_id', $outletId)
                ->select('shifts.*', 'cash_registers.name as register_name', 'users.name as user_name')
                ->latest('shifts.opened_at')->limit(50)->get(),
            'cash_registers' => DB::table('cash_registers')->where('outlet_id', $outletId)->where('is_active', true)->get(),
            'cash_movements' => DB::table('cash_movements')->leftJoin('users', 'users.id', '=', 'cash_movements.user_id')
                ->select('cash_movements.*', 'users.name as user_name')->latest('cash_movements.created_at')->limit(100)->get(),
        ]);
    }

    public function storePromotion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:40', 'unique:promotions,code'],
            'type' => ['required', Rule::in(['percentage', 'fixed'])],
            'value' => ['required', 'numeric', 'gt:0'],
            'minimum_purchase' => ['nullable', 'numeric', 'min:0'],
            'maximum_discount' => ['nullable', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);
        $id = DB::table('promotions')->insertGetId($data + [
            'is_active' => true, 'used_count' => 0, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json(DB::table('promotions')->find($id), 201);
    }

    public function payDebt(Request $request, int $debt): JsonResponse
    {
        $data = $request->validate(['amount' => ['required', 'numeric', 'gt:0']]);
        $row = DB::transaction(function () use ($debt, $data) {
            $debtRow = DB::table('debts')->where('id', $debt)->lockForUpdate()->first();
            abort_unless($debtRow !== null, 404, 'Data hutang atau piutang tidak ditemukan.');
            $remaining = (float) $debtRow->total_amount - (float) $debtRow->paid_amount;
            $paid = min((float) $data['amount'], $remaining);
            $newPaid = (float) $debtRow->paid_amount + $paid;
            DB::table('debts')->where('id', $debt)->update([
                'paid_amount' => $newPaid,
                'status' => $newPaid >= (float) $debtRow->total_amount ? 'paid' : 'partial',
                'updated_at' => now(),
            ]);

            return DB::table('debts')->find($debt);
        });

        return response()->json($row);
    }

    public function users(Request $request): JsonResponse
    {
        return response()->json(User::query()->with('outlet:id,name')->orderBy('name')->get());
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'cashier'])],
            'outlet_id' => ['required', 'exists:outlets,id'],
        ]);
        $user = User::query()->create([
            'name' => $data['name'], 'email' => $data['email'], 'password' => Hash::make($data['password']),
        ]);
        $user->forceFill([
            'outlet_id' => $data['outlet_id'], 'role' => $data['role'], 'is_active' => true, 'email_verified_at' => now(),
        ])->save();

        return response()->json($user->load('outlet:id,name'), 201);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'role' => ['sometimes', Rule::in(['admin', 'cashier'])],
            'outlet_id' => ['sometimes', 'exists:outlets,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if ($user->is($request->user()) && array_key_exists('is_active', $data) && ! $data['is_active']) {
            throw ValidationException::withMessages(['is_active' => 'Anda tidak dapat menonaktifkan akun sendiri.']);
        }
        $user->forceFill($data)->save();

        return response()->json($user->fresh()->load('outlet:id,name'));
    }

    private function outletId(Request $request): int
    {
        return (int) ($request->integer('outlet_id') ?: $request->user()->outlet_id ?: DB::table('outlets')->value('id'));
    }

    private function receiptPayload(Request $request, Sale $sale): Sale
    {
        $sale->load(['items', 'payments', 'customer', 'user']);
        if ($request->user()->role === 'cashier') {
            $sale->items->each->makeHidden('cost_price');
        }
        $outlet = Outlet::query()->find($sale->outlet_id);
        $receiptSettings = DB::table('settings')->where(fn ($query) => $query
            ->whereNull('outlet_id')->orWhere('outlet_id', $sale->outlet_id))->pluck('value', 'key');
        $sale->setAttribute('receipt_profile', [
            'business_name' => $receiptSettings->get('business_name', 'Putri Collection'),
            'outlet_name' => $outlet?->name,
            'address' => $outlet?->address,
            'city' => $outlet?->city,
            'phone' => $outlet?->phone,
            'footer' => $outlet?->receipt_footer,
            'paper_width' => $receiptSettings->get('receipt_width', '80mm'),
            'logo' => '/images/putri-collection-logo.svg',
            'whatsapp' => $receiptSettings->get('whatsapp', $outlet?->phone),
        ]);

        return $sale;
    }

    private function recordStockMovement(Request $request, int $productId, string $type, float $quantity, float $before, float $after, mixed $reference, ?string $notes, ?int $variantId = null): void
    {
        DB::table('stock_movements')->insert([
            'outlet_id' => $this->outletId($request), 'product_id' => $productId, 'product_variant_id' => $variantId, 'user_id' => $request->user()->id,
            'type' => $type, 'quantity' => $quantity, 'before_quantity' => $before, 'after_quantity' => $after,
            'reference_type' => $reference ? $reference::class : null, 'reference_id' => $reference?->id,
            'notes' => $notes, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function ean13CheckDigit(string $digits): int
    {
        $sum = 0;
        foreach (str_split($digits) as $index => $digit) {
            $sum += (int) $digit * ($index % 2 === 0 ? 1 : 3);
        }

        return (10 - ($sum % 10)) % 10;
    }
}
