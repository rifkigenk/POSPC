<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>Putri Collection · Kasir & Butik Muslim</title>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/images/putri-collection-logo.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts
        @viteReactRefresh
        @vite('resources/js/pos/main.jsx')
    </head>
    <body>
        <div id="pos-root" data-app-name="{{ config('app.name') }}"></div>
    </body>
</html>
