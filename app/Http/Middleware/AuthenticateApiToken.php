<?php

namespace App\Http\Middleware;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        /** @var PersonalAccessToken|null $accessToken */
        $accessToken = PersonalAccessToken::query()
            ->where('token', hash('sha256', $plainToken))
            ->with('user')
            ->first();

        if (! $accessToken || ! $accessToken->user) {
            return response()->json(['message' => 'Invalid token.'], 401);
        }

        if ($accessToken->isExpired()) {
            $accessToken->delete();

            return response()->json(['message' => 'Token expired.'], 401);
        }

        // Sliding window: extend expiry when fewer than threshold days remain.
        $daysLeft = (int) now()->diffInDays($accessToken->expires_at, absolute: false);

        if ($daysLeft < User::TOKEN_RENEW_THRESHOLD_DAYS) {
            $accessToken->expires_at = now()->addDays(User::TOKEN_TTL_DAYS);
        }

        $accessToken->last_used_at = now();
        $accessToken->save();

        /** @var User $user */
        $user = $accessToken->user;

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        // Make the plain token available for targeted logout.
        $request->attributes->set('bearer_token', $plainToken);

        return $next($request);
    }
}
