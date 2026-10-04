<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="0;url={{ route('pos') }}">
        <title>Membuka Putri Collection...</title>
    </head>
    <body>
        <p>Membuka <a href="{{ route('pos') }}">Putri Collection</a>...</p>
        <script>window.location.replace(@js(route('pos')));</script>
    </body>
</html>
