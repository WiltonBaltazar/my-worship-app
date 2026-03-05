<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PushSubscriptionController extends Controller
{
    public function vapidPublicKey(): JsonResponse
    {
        $publicKey = (string) config('webpush.vapid.public_key');

        if ($publicKey === '') {
            throw ValidationException::withMessages([
                'vapid' => ['VAPID public key is not configured.'],
            ]);
        }

        return response()->json([
            'public_key' => $publicKey,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'string', 'max:4096'],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string', 'max:1024'],
            'keys.auth' => ['required', 'string', 'max:1024'],
        ]);
        $endpointHash = hash('sha256', $validated['endpoint']);

        PushSubscription::query()->updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'endpoint_hash' => $endpointHash,
            ],
            [
                'endpoint' => $validated['endpoint'],
                'p256dh' => $validated['keys']['p256dh'],
                'auth' => $validated['keys']['auth'],
            ],
        );

        return response()->json([
            'message' => 'Push subscription saved.',
        ], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => ['nullable', 'string', 'max:4096'],
        ]);

        $query = PushSubscription::query()
            ->where('user_id', $request->user()->id);

        if (! empty($validated['endpoint'])) {
            $query->where('endpoint_hash', hash('sha256', $validated['endpoint']));
        }

        $deleted = $query->delete();

        return response()->json([
            'message' => 'Push subscription removed.',
            'deleted' => $deleted,
        ]);
    }
}
