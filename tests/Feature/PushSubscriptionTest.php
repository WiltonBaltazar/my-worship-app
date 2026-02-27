<?php

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_read_vapid_public_key(): void
    {
        config(['webpush.vapid.public_key' => 'test-public-key']);
        $user = User::factory()->create();

        $response = $this->getJson(
            '/api/push-subscriptions/vapid-public-key',
            $this->authHeadersFor($user),
        );

        $response
            ->assertOk()
            ->assertJsonPath('public_key', 'test-public-key');
    }

    public function test_user_can_store_or_update_push_subscription(): void
    {
        $user = User::factory()->create();

        $payload = [
            'endpoint' => 'https://example.push.service/subscription-id',
            'keys' => [
                'p256dh' => 'public-key-v1',
                'auth' => 'auth-key-v1',
            ],
        ];

        $this->postJson('/api/push-subscriptions', $payload, $this->authHeadersFor($user))
            ->assertCreated();

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint' => $payload['endpoint'],
            'p256dh' => 'public-key-v1',
            'auth' => 'auth-key-v1',
        ]);

        $this->postJson('/api/push-subscriptions', [
            ...$payload,
            'keys' => [
                'p256dh' => 'public-key-v2',
                'auth' => 'auth-key-v2',
            ],
        ], $this->authHeadersFor($user))->assertCreated();

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint' => $payload['endpoint'],
            'p256dh' => 'public-key-v2',
            'auth' => 'auth-key-v2',
        ]);

        $this->assertSame(
            1,
            PushSubscription::query()
                ->where('user_id', $user->id)
                ->where('endpoint', $payload['endpoint'])
                ->count(),
        );
    }

    public function test_user_can_delete_only_own_push_subscription(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        PushSubscription::query()->create([
            'user_id' => $user->id,
            'endpoint' => 'https://example.push.service/me',
            'p256dh' => 'p256dh-me',
            'auth' => 'auth-me',
        ]);

        PushSubscription::query()->create([
            'user_id' => $otherUser->id,
            'endpoint' => 'https://example.push.service/other',
            'p256dh' => 'p256dh-other',
            'auth' => 'auth-other',
        ]);

        $this->deleteJson(
            '/api/push-subscriptions',
            ['endpoint' => 'https://example.push.service/me'],
            $this->authHeadersFor($user),
        )->assertOk()->assertJsonPath('deleted', 1);

        $this->assertDatabaseMissing('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint' => 'https://example.push.service/me',
        ]);

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $otherUser->id,
            'endpoint' => 'https://example.push.service/other',
        ]);
    }

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . $user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
