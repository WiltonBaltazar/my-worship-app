<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\Schedule;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MinistryScopedAbsenceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(); // First user becomes admin.
    }

    public function test_absence_for_one_ministry_only_blocks_that_ministry(): void
    {
        $member = $this->createMember(inDms: true, homeGroup: 'GHJ');
        $date = now()->addWeek()->format('Y-m-d');

        $this->patchJson("/api/profiles/{$member->id}", [
            'unavailable_dates' => [['date' => $date, 'ministry' => 'ghj']],
        ], $this->authHeadersFor($this->userOf($member)))
            ->assertOk()
            ->assertJsonPath('unavailable_dates.0', ['date' => $date, 'ministry' => 'ghj']);

        $payload = ['profile_id' => $member->id, 'function_type' => 'instrumentalist'];

        $this->postJson("/api/schedules/{$this->createSchedule($date, 'ghj')->id}/members", $payload, $this->authHeadersFor($this->createLeader('ghj')))
            ->assertUnprocessable();
        $this->postJson("/api/schedules/{$this->createSchedule($date, 'dms')->id}/members", $payload, $this->authHeadersFor($this->createLeader('dms')))
            ->assertCreated();
    }

    public function test_absences_for_another_ministry_are_hidden_from_its_outsiders(): void
    {
        $member = $this->createMember(inDms: true, homeGroup: 'GHJ');
        $member->unavailableDates()->createMany([
            ['unavailable_date' => now()->addDays(3)->format('Y-m-d'), 'ministry' => 'ghj'],
            ['unavailable_date' => now()->addDays(4)->format('Y-m-d'), 'ministry' => null],
        ]);
        $member->unavailablePeriods()->create([
            'start_date' => now()->addDays(5)->format('Y-m-d'),
            'end_date' => now()->addDays(9)->format('Y-m-d'),
            'ministry' => 'ghj',
        ]);
        $member->update(['paused_at' => now(), 'paused_ministry' => 'ghj']);

        $dmsLeaderView = $this->profileAsSeenBy($this->createLeader('dms'), $member);
        $this->assertCount(1, $dmsLeaderView['unavailable_dates']);
        $this->assertNull($dmsLeaderView['unavailable_dates'][0]['ministry']);
        $this->assertSame([], $dmsLeaderView['unavailable_periods']);
        $this->assertFalse($dmsLeaderView['is_paused']);

        $ghjLeaderView = $this->profileAsSeenBy($this->createLeader('ghj'), $member);
        $this->assertCount(2, $ghjLeaderView['unavailable_dates']);
        $this->assertCount(1, $ghjLeaderView['unavailable_periods']);
        $this->assertTrue($ghjLeaderView['is_paused']);
        $this->assertSame('ghj', $ghjLeaderView['pause_ministry']);
    }

    public function test_pause_for_one_ministry_keeps_member_available_for_the_other(): void
    {
        $member = $this->createMember(inDms: true, homeGroup: 'GHJ');
        $date = now()->addWeek()->format('Y-m-d');

        $this->patchJson("/api/profiles/{$member->id}", ['is_paused' => true, 'pause_ministry' => 'dms'], $this->authHeadersFor($this->userOf($member)))
            ->assertOk()
            ->assertJsonPath('is_paused', true)
            ->assertJsonPath('pause_ministry', 'dms');

        $payload = ['profile_id' => $member->id, 'function_type' => 'instrumentalist'];

        $this->postJson("/api/schedules/{$this->createSchedule($date, 'dms')->id}/members", $payload, $this->authHeadersFor($this->createLeader('dms')))
            ->assertUnprocessable()
            ->assertJsonPath('errors.profile_id.0', "{$member->name} pausou as escalas.");
        $this->postJson("/api/schedules/{$this->createSchedule($date, 'ghj')->id}/members", $payload, $this->authHeadersFor($this->createLeader('ghj')))
            ->assertCreated();
    }

    public function test_leader_pause_only_touches_the_ministries_they_lead(): void
    {
        $member = $this->createMember(inDms: true, homeGroup: 'GHJ');
        $member->update(['paused_at' => now(), 'paused_ministry' => 'ghj']);
        $dmsLeader = $this->createLeader('dms');

        $this->patchJson("/api/profiles/{$member->id}", ['is_paused' => true], $this->authHeadersFor($dmsLeader))
            ->assertOk();
        $this->assertNull($member->fresh()->paused_ministry);
        $this->assertNotNull($member->fresh()->paused_at);

        $this->patchJson("/api/profiles/{$member->id}", ['is_paused' => false], $this->authHeadersFor($dmsLeader))
            ->assertOk()
            ->assertJsonPath('is_paused', false);
        $this->assertSame('ghj', $member->fresh()->paused_ministry);
    }

    public function test_single_ministry_member_absences_and_pause_cover_everything(): void
    {
        $member = $this->createMember(inDms: true, homeGroup: 'GHH');
        $date = now()->addWeek()->format('Y-m-d');

        $this->patchJson("/api/profiles/{$member->id}", [
            'unavailable_dates' => [['date' => $date, 'ministry' => 'dms']],
            'is_paused' => true,
            'pause_ministry' => 'dms',
        ], $this->authHeadersFor($this->userOf($member)))
            ->assertOk()
            ->assertJsonPath('unavailable_dates.0.ministry', null)
            ->assertJsonPath('pause_ministry', null);
    }

    public function test_same_date_for_both_ministries_is_stored_once_for_all(): void
    {
        $member = $this->createMember(inDms: true, homeGroup: 'GHJ');
        $date = now()->addWeek()->format('Y-m-d');

        $this->patchJson("/api/profiles/{$member->id}", [
            'unavailable_dates' => [
                ['date' => $date, 'ministry' => 'dms'],
                ['date' => $date, 'ministry' => 'ghj'],
            ],
        ], $this->authHeadersFor($this->userOf($member)))
            ->assertOk()
            ->assertJsonCount(1, 'unavailable_dates')
            ->assertJsonPath('unavailable_dates.0.ministry', null);
    }

    private function profileAsSeenBy(User $viewer, Profile $member): array
    {
        return collect($this->getJson('/api/profiles', $this->authHeadersFor($viewer))->assertOk()->json())
            ->firstWhere('id', $member->id);
    }

    private function createLeader(string $ministry): User
    {
        $leader = User::factory()->create();
        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => $ministry === 'ghj' ? 'GHJ' : 'GHH',
            'in_dms' => $ministry === 'dms',
            'leads_dms' => $ministry === 'dms',
            'leads_ghj' => $ministry === 'ghj',
        ]);

        UserRole::query()->where('user_id', $leader->id)->delete();
        UserRole::query()->create(['user_id' => $leader->id, 'role' => 'leader']);

        return $leader->fresh('profile');
    }

    private function createMember(bool $inDms, string $homeGroup): Profile
    {
        $profile = User::factory()->create()->profile()->firstOrFail();
        $profile->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => $homeGroup,
            'in_dms' => $inDms,
        ]);
        $profile->instruments()->create(['instrument' => 'guitar']);

        return $profile->fresh();
    }

    private function userOf(Profile $profile): User
    {
        return User::query()->findOrFail($profile->user_id);
    }

    private function createSchedule(string $date, string $ministry): Schedule
    {
        return Schedule::query()->create([
            'schedule_date' => $date,
            'start_time' => '11:00:00',
            'status' => 'draft',
            'schedule_type' => 'worship',
            'ministry' => $ministry,
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
