<?php

use App\Http\Controllers\PosController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('pos')->middleware('auth:sanctum')->controller(PosController::class)->group(function () {
    Route::get('/bootstrap', 'bootstrap');
    Route::get('/dashboard', 'dashboard');
    Route::get('/products', 'products');
    Route::get('/customers', 'customers');
    Route::get('/sales', 'sales');
    Route::post('/sales', 'storeSale');
    Route::get('/sales/{sale}/receipt', 'receipt');
    Route::get('/suspended-transactions', 'suspendedTransactions');
    Route::post('/suspended-transactions', 'storeSuspendedTransaction');
    Route::delete('/suspended-transactions/{suspendedTransaction}', 'destroySuspendedTransaction');

    Route::middleware('role:admin')->group(function () {
        Route::post('/categories', 'storeCategory');
        Route::put('/categories/{category}', 'updateCategory');
        Route::delete('/categories/{category}', 'destroyCategory');
        Route::post('/customers', 'storeCustomer');
        Route::post('/products', 'storeProduct');
        Route::put('/products/{product}', 'updateProduct');
        Route::delete('/products/{product}', 'destroyProduct');
        Route::post('/products/{product}/image', 'uploadProductImage');
        Route::post('/barcodes/generate', 'generateBarcode');
        Route::post('/inventory/adjust', 'adjustStock');
        Route::get('/suppliers', 'suppliers');
        Route::post('/suppliers', 'storeSupplier');
        Route::post('/sales/{sale}/void', 'voidSale');
        Route::get('/purchases', 'purchases');
        Route::post('/purchases', 'storePurchase');
        Route::get('/expenses', 'expenses');
        Route::post('/expenses', 'storeExpense');
        Route::get('/reports', 'reports');
        Route::get('/operations', 'operations');
        Route::post('/promotions', 'storePromotion');
        Route::post('/debts/{debt}/pay', 'payDebt');
        Route::get('/stock-opnames', 'stockOpnames');
        Route::post('/stock-opnames', 'storeStockOpname');
        Route::get('/users', 'users');
        Route::post('/users', 'storeUser');
        Route::put('/users/{user}', 'updateUser');
    });
});
