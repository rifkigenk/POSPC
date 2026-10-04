<?php

test('home redirects guests to the login screen', function () {
    $response = $this->get(route('home'));

    $response->assertRedirect(route('login'));
});
