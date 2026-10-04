<?php

use App\Models\User;

test('guests must sign in before opening the POS frontend', function () {
    $this->get('/pos')->assertRedirect(route('login'));
});

test('authenticated users can open the React POS frontend', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/pos')
        ->assertOk()
        ->assertSee('id="pos-root"', false)
        ->assertSee('Putri Collection · Kasir & Butik Muslim', false);
});

test('the POS fallback route supports client-side paths', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $this->actingAs($user)
        ->get('/pos/products')
        ->assertOk()
        ->assertSee('id="pos-root"', false);
});

test('cashier cannot open admin pages directly', function () {
    $user = User::factory()->create(['role' => 'cashier']);

    $this->actingAs($user)->get('/pos/products')->assertForbidden();
});
