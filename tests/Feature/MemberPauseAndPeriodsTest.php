<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\Schedule;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberPauseAndPeriodsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(); // First user becomes admin.
    }

    public function test_member_pauses_and_resumes_from_their_profile(): void
    {
        $member = $this->createMember();
        $user = User::query()->findOrFail($member->user_id);

        $this->patchJson("/api/profiles/{$member->id}", ['is_paused' => true], $this->authHeadersFor($user))
            ->assertOk()
            ->assertJsonPath('is_paused', true);

        $this->assertNotNull($member->fresh()->paused_at);

        $this->patchJson("/api/profiles/{$member->id}", ['is_paused' => false], $this->authHeadersFor($user))
            ->assertOk()
            ->assertJsonPath('is_paused', false);
    }

    public function test_paused_member_cannot_be_added_to_a_schedule(): void
    {
        $leader = $this->createLeader();
        $member = $this->createMember();
        $member->update(['paused_at' => now()]);
        $schedule = $this->createSchedule(now()->addWeek()->format('Y-m-d'));

        $this->postJson("/api/schedules/{$schedule->id}/members", [
            'profile_id' => $member->id,
            'function_type' => 'instrumentalist',
        ], $this->authHeadersFor($leader))
            ->assertUnprocessable()
            ->assertJsonPath('errors.profile_id.0', "{$member->name} pausou as escalas.");
    }

    public function test_unavailable_period_blocks_every_date_inside_it(): void
    {
        $leader = $this->createLeader();
        $member = $this->createMember();
        $user = User::query()->findOrFail($member->user_id);

        $start = now()->addDays(3)->format('Y-m-d');
        $end = now()->addDays(20)->format('Y-m-d');

        $this->patchJson("/api/profiles/{$member->id}", [
            'unavailable_periods' => [['start_date' => $start, 'end_date' => $end]],
        ], $this->authHeadersFor($user))
            ->assertOk()
            ->assertJsonPath('unavailable_periods.0.start_date', $start)
            ->assertJsonPath('unavailable_periods.0.end_date', $end);

        $inside = $this->createSchedule(now()->addDays(10)->format('Y-m-d'));
        $outside = $this->createSchedule(now()->addDays(25)->format('Y-m-d'));

        $payload = ['profile_id' => $member->id, 'function_type' => 'instrumentalist'];

        $this->postJson("/api/schedules/{$inside->id}/members", $payload, $this->authHeadersFor($leader))
            ->assertUnprocessable();
        $this->postJson("/api/schedules/{$outside->id}/members", $payload, $this->authHeadersFor($leader))
            ->assertCreated();
    }

    public function test_period_end_cannot_be_before_start(): void
    {
        $member = $this->createMember();

        $this->patchJson("/api/profiles/{$member->id}", [
            'unavailable_periods' => [['start_date' => '2030-05-10', 'end_date' => '2030-05-01']],
        ], $this->authHeadersFor(User::query()->findOrFail($member->user_id)))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['unavailable_periods.0.end_date']);
    }

    public function test_paused_members_are_not_asked_in_availability_calls(): void
    {
        $leader = $this->createLeader();
        $active = $this->createMember();
        $paused = $this->createMember();
        $paused->update(['paused_at' => now()]);
        $schedule = $this->createSchedule(now()->addWeek()->format('Y-m-d'));

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))->assertOk();

        $notified = AppNotification::query()->where('type', 'availability_call')->pluck('user_id')->all();
        $this->assertContains($active->user_id, $notified);
        $this->assertNotContains($paused->user_id, $notified);
    }

    public function test_leader_pauses_members_of_their_ministry_only(): void
    {
        $leader = $this->createLeader();
        $dmsMember = $this->createMember();
        $ghjYouth = $this->createMember();
        $ghjYouth->update(['home_group' => 'GHJ', 'in_dms' => false]);

        $this->patchJson("/api/profiles/{$dmsMember->id}", ['is_paused' => true], $this->authHeadersFor($leader))
            ->assertOk()
            ->assertJsonPath('is_paused', true);

        $this->patchJson("/api/profiles/{$ghjYouth->id}", ['is_paused' => true], $this->authHeadersFor($leader))
            ->assertForbidden();

        // Pausing doesn't open up other fields to leaders.
        $this->patchJson("/api/profiles/{$dmsMember->id}", ['is_paused' => false, 'name' => 'Outro'], $this->authHeadersFor($leader))
            ->assertForbidden();
    }

    public function test_rota_generation_skips_paused_and_absent_technicians(): void
    {
        $weekOne = now()->next('Sunday');
        $weekTwo = $weekOne->copy()->addWeek();

        $techs = collect(range(1, 4))->map(function (int $n): Profile {
            $profile = User::factory()->create()->profile()->firstOrFail();
            $profile->update([
                'name' => "Tech {$n}",
                'is_approved' => true,
                'is_active' => true,
                'can_be_tech_lead' => true,
                'can_be_tech_sound' => true,
            ]);

            return $profile->fresh();
        });

        $techs[0]->update(['paused_at' => now()]);
        $techs[1]->unavailableDates()->create(['unavailable_date' => $weekOne->format('Y-m-d')]);
        $techs[2]->unavailablePeriods()->create([
            'start_date' => $weekTwo->format('Y-m-d'),
            'end_date' => $weekTwo->copy()->addDays(10)->format('Y-m-d'),
        ]);

        $weeks = collect($this->postJson('/api/technical-schedules/generate', [
            'start_date' => $weekOne->format('Y-m-d'),
            'weeks' => 2,
        ], $this->authHeadersFor($this->admin))->assertOk()->json('weeks'))->keyBy('week_start_date');

        $assigned = fn (string $date): array => array_filter([
            $weeks[$date]['lead_profile_id'],
            $weeks[$date]['sound_profile_id'],
        ]);

        $one = $assigned($weekOne->format('Y-m-d'));
        $two = $assigned($weekTwo->format('Y-m-d'));

        $this->assertNotContains($techs[0]->id, [...$one, ...$two]);
        $this->assertNotContains($techs[1]->id, $one);
        $this->assertNotContains($techs[2]->id, $two);
        $this->assertCount(2, $one);
    }

    private function createLeader(): User
    {
        $leader = User::factory()->create();
        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => 'GHH',
            'in_dms' => true,
            'leads_dms' => true,
        ]);

        UserRole::query()->where('user_id', $leader->id)->delete();
        UserRole::query()->create(['user_id' => $leader->id, 'role' => 'leader']);

        return $leader->fresh('profile');
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

    private function createSchedule(string $date): Schedule
    {
        return Schedule::query()->create([
            'schedule_date' => $date,
            'start_time' => '11:00:00',
            'status' => 'draft',
            'schedule_type' => 'worship',
            'ministry' => 'dms',
            'created_by' => $this->admin->id,
        ]);
    }

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
