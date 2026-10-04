<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => auth()->check()
    ? redirect()->route('pos')
    : redirect()->route('login'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::view('dashboard', 'dashboard')->name('dashboard');

    // Halaman manajemen diberi middleware server-side; kasir tidak dapat
    // membukanya walaupun mengetik URL secara langsung.
    Route::view('pos/{path}', 'pos')
        ->whereIn('path', ['products', 'inventory', 'stock-opname', 'activity', 'purchases', 'suppliers', 'promotions', 'expenses', 'finance', 'shifts', 'reports', 'employees', 'settings'])
        ->middleware('role:admin');

    Route::view('pos/{path?}', 'pos')
        ->where('path', '.*')
        ->name('pos');
});

require __DIR__.'/settings.php';
