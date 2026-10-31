<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\Schedule;
use App\Models\ScheduleMember;
use App\Models\SubstituteRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeaderSubstituteTest extends TestCase
{
    use RefreshDatabase;

    public function test_leader_replaces_a_member_who_asked_for_a_swap(): void
    {
        $admin = User::factory()->create(); // First user becomes admin.
        $requester = $this->createMember();
        $invited = $this->createMember();
        $substitute = $this->createMember();

        [$schedule, $member] = $this->scheduleWith($admin, $requester);
        $member->update(['requested_change' => true, 'change_reason' => 'Viagem']);

        $this->postJson('/api/substitute-requests', [
            'schedule_member_id' => $member->id,
            'candidate_profile_ids' => [$invited->id],
        ], $this->authHeadersFor(User::query()->findOrFail($requester->user_id)))->assertCreated();

        $this->postJson("/api/schedule-members/{$member->id}/substitute", [
            'profile_id' => $substitute->id,
        ], $this->authHeadersFor($admin))
            ->assertOk()
            ->assertJsonPath('profile_id', $substitute->id)
            ->assertJsonPath('function_type', 'instrumentalist')
            ->assertJsonPath('function_detail', 'Guitarra')
            ->assertJsonPath('confirmed', true);

        $this->assertDatabaseMissing('schedule_members', ['schedule_id' => $schedule->id, 'profile_id' => $requester->id]);
        $this->assertSame(0, SubstituteRequest::query()->where('status', 'pending')->count());
        $this->assertTrue(AppNotification::query()->where('user_id', $requester->user_id)->where('title', 'Troca aprovada')->exists());
        $this->assertTrue(
            AppNotification::query()->where('user_id', $substitute->user_id)->where('title', 'Você foi escalado(a) como substituto(a)')->exists()
        );
    }

    public function test_substitute_must_be_available_and_not_already_on_the_schedule(): void
    {
        $admin = User::factory()->create();
        $requester = $this->createMember();
        $colleague = $this->createMember();
        $away = $this->createMember();

        [$schedule, $member] = $this->scheduleWith($admin, $requester);
        $schedule->members()->create(['profile_id' => $colleague->id, 'function_type' => 'instrumentalist']);
        $away->unavailableDates()->create(['unavailable_date' => $schedule->schedule_date->format('Y-m-d')]);

        foreach ([$colleague, $away] as $candidate) {
            $this->postJson("/api/schedule-members/{$member->id}/substitute", [
                'profile_id' => $candidate->id,
            ], $this->authHeadersFor($admin))->assertUnprocessable()->assertJsonValidationErrors('profile_id');
        }

        $this->assertTrue(ScheduleMember::query()->whereKey($member->id)->exists());
    }

    public function test_members_cannot_pick_their_own_substitute(): void
    {
        $admin = User::factory()->create();
        $requester = $this->createMember();
        $substitute = $this->createMember();

        [, $member] = $this->scheduleWith($admin, $requester);

        $this->postJson("/api/schedule-members/{$member->id}/substitute", [
            'profile_id' => $substitute->id,
        ], $this->authHeadersFor(User::query()->findOrFail($requester->user_id)))->assertForbidden();
    }

    /** @return array{0: Schedule, 1: ScheduleMember} */
    private function scheduleWith(User $admin, Profile $profile): array
    {
        $schedule = Schedule::query()->create([
            'schedule_date' => now()->addWeek()->format('Y-m-d'),
            'start_time' => '11:00:00',
            'status' => 'published',
            'schedule_type' => 'worship',
            'ministry' => 'dms',
            'created_by' => $admin->id,
        ]);
        $member = $schedule->members()->create([
            'profile_id' => $profile->id,
            'function_type' => 'instrumentalist',
            'function_detail' => 'Guitarra',
        ]);

        return [$schedule->fresh(), $member];
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
