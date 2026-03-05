<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_notifications_index_only_returns_notifications_from_registration_day_and_future(): void
    {
        $user = User::factory()->create([
            'created_at' => '2026-03-01 15:30:00',
        ]);

        $beforeRegistrationDay = AppNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Before registration day',
            'message' => 'Should not be visible.',
            'type' => 'announcement',
            'read' => false,
            'created_at' => '2026-02-28 23:59:59',
        ]);

        $sameDayNotification = AppNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Same day notification',
            'message' => 'Should be visible.',
            'type' => 'announcement',
            'read' => false,
            'created_at' => '2026-03-01 08:00:00',
        ]);

        $futureNotification = AppNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Future notification',
            'message' => 'Should be visible.',
            'type' => 'announcement',
            'read' => false,
            'created_at' => '2026-03-03 09:00:00',
        ]);

        $response = $this->getJson('/api/notifications', $this->authHeadersFor($user));

        $response
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonMissing(['id' => $beforeRegistrationDay->id])
            ->assertJsonPath('0.id', $futureNotification->id)
            ->assertJsonPath('1.id', $sameDayNotification->id);
    }

    public function test_unread_count_ignores_notifications_before_registration_day(): void
    {
        $user = User::factory()->create([
            'created_at' => '2026-03-01 15:30:00',
        ]);

        AppNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Old unread',
            'message' => 'Should not be counted.',
            'type' => 'announcement',
            'read' => false,
            'created_at' => '2026-02-28 22:00:00',
        ]);

        AppNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Same day unread',
            'message' => 'Should be counted.',
            'type' => 'announcement',
            'read' => false,
            'created_at' => '2026-03-01 00:30:00',
        ]);

        AppNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Future read',
            'message' => 'Should not be counted.',
            'type' => 'announcement',
            'read' => true,
            'created_at' => '2026-03-02 10:00:00',
        ]);

        AppNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Future unread',
            'message' => 'Should be counted.',
            'type' => 'announcement',
            'read' => false,
            'created_at' => '2026-03-03 10:00:00',
        ]);

        $this->getJson('/api/notifications/unread-count', $this->authHeadersFor($user))
            ->assertOk()
            ->assertJsonPath('count', 2);
    }

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . $user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
