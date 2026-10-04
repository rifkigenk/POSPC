<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || $user->is_active === false) {
            abort(401, 'Akun tidak aktif atau sesi telah berakhir.');
        }

        if (! in_array($user->role, $roles, true)) {
            abort(403, 'Fitur ini dikunci untuk role '.ucfirst($user->role).'. Hubungi Owner atau Manager.');
        }

        return $next($request);
    }
}
