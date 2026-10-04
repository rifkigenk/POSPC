<?php

test('the API health endpoint is available', function () {
    $response = $this->getJson('/api/health');

    $response
        ->assertOk()
        ->assertJson([
            'status' => 'ok',
            'service' => config('app.name'),
        ])
        ->assertJsonStructure(['timestamp']);
});

test('the API user endpoint requires authentication', function () {
    $this->getJson('/api/user')->assertUnauthorized();
});
