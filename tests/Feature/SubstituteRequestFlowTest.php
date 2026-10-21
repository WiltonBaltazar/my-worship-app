<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubstituteRequestFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_candidate_is_sent_to_a_schedule_they_can_open_and_answer(): void
    {
        $admin = User::factory()->create(); // First user becomes admin.
        $requester = $this->createMember();
        $candidate = $this->createMember();
        $candidateUser = User::query()->findOrFail($candidate->user_id);

        $schedule = Schedule::query()->create([
            'schedule_date' => now()->addWeek()->format('Y-m-d'),
            'start_time' => '11:00:00',
            'status' => 'published',
            'schedule_type' => 'worship',
            'ministry' => 'dms',
            'created_by' => $admin->id,
        ]);
        $member = $schedule->members()->create([
            'profile_id' => $requester->id,
            'function_type' => 'instrumentalist',
            'function_detail' => 'Guitarra',
        ]);

        $this->postJson('/api/substitute-requests', [
            'schedule_member_id' => $member->id,
            'candidate_profile_ids' => [$candidate->id],
        ], $this->authHeadersFor(User::query()->findOrFail($requester->user_id)))->assertCreated();

        $notification = AppNotification::query()
            ->where('user_id', $candidate->user_id)
            ->where('type', 'substitute_request')
            ->firstOrFail();
        $this->assertSame($schedule->id, $notification->schedule_id);

        // The schedule page the notification opens must be visible to the candidate...
        $visible = collect($this->getJson('/api/schedules', $this->authHeadersFor($candidateUser))->json())->pluck('id');
        $this->assertContains($schedule->id, $visible);

        // ...and their pending request for it is what the page shows to accept or refuse.
        $requestId = $this->getJson('/api/substitute-requests/my', $this->authHeadersFor($candidateUser))
            ->assertOk()
            ->assertJsonPath('0.schedule_member.schedule_id', $schedule->id)
            ->json('0.id');

        $this->postJson("/api/substitute-requests/{$requestId}/reject", [], $this->authHeadersFor($candidateUser))->assertOk();
        $this->getJson('/api/substitute-requests/my', $this->authHeadersFor($candidateUser))->assertJsonCount(0);
    }

    private function createMember(): Profile
    {
        $profile = User::factory()->create()->profile()->firstOrFail();
        $profile->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => 'GHH',
            'in_dms' => true,
        ]);
        $profile->instruments()->create(['instrument' => 'guitar']);

        return $profile->fresh();
    }

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
