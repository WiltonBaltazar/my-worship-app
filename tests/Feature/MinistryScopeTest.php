<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\Schedule;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MinistryScopeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(); // First user becomes admin.
    }

    public function test_ghj_leader_lists_only_ghj_profiles_by_default(): void
    {
        $leader = $this->createLeader('GHJ', leadsGhj: true);
        $ghjMember = $this->createMember('GHJ');
        $dmsMember = $this->createMember('GHH', inDms: true);

        $profileIds = $this->listProfileIds($leader);

        $this->assertContains($ghjMember->id, $profileIds);
        $this->assertNotContains($dmsMember->id, $profileIds);
    }

    public function test_ghj_leader_serving_in_dms_can_list_dms_pool_for_substitutes(): void
    {
        $leader = $this->createLeader('GHJ', leadsGhj: true);
        $dmsMember = $this->createMember('GHH', inDms: true);

        $this->assertContains($dmsMember->id, $this->listProfileIds($leader, 'dms'));
    }

    public function test_young_dms_leader_sees_dms_roster_including_ghj_youth(): void
    {
        $leader = $this->createLeader('GHJ', leadsDms: true);
        $ghjYouthInDms = $this->createMember('GHJ', inDms: true);
        $ghjYouthOutsideDms = $this->createMember('GHJ');
        $adultInDms = $this->createMember('GHS', inDms: true);

        $profileIds = $this->listProfileIds($leader, 'dms');

        $this->assertContains($ghjYouthInDms->id, $profileIds);
        $this->assertContains($adultInDms->id, $profileIds);
        $this->assertNotContains($ghjYouthOutsideDms->id, $profileIds);
    }

    public function test_leader_of_both_ministries_sees_each_pool(): void
    {
        $leader = $this->createLeader('GHS', leadsDms: true, leadsGhj: true);
        $ghjOnly = $this->createMember('GHJ');
        $dmsOnly = $this->createMember('GHH', inDms: true);

        $dmsIds = $this->listProfileIds($leader, 'dms');
        $ghjIds = $this->listProfileIds($leader, 'ghj');

        $this->assertContains($dmsOnly->id, $dmsIds);
        $this->assertNotContains($ghjOnly->id, $dmsIds);
        $this->assertContains($ghjOnly->id, $ghjIds);
        $this->assertNotContains($dmsOnly->id, $ghjIds);
    }

    public function test_add_member_to_ghj_schedule_rejects_non_ghj_profile(): void
    {
        $schedule = $this->createSchedule('ghj');
        $outsider = $this->createMember('GHH', inDms: true);

        $this->postJson(
            "/api/schedules/{$schedule->id}/members",
            ['profile_id' => $outsider->id, 'function_type' => 'instrumentalist'],
            $this->authHeadersFor($this->admin),
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_id']);
    }

    public function test_add_member_to_dms_schedule_rejects_profile_outside_roster(): void
    {
        $schedule = $this->createSchedule('dms');
        $outsider = $this->createMember('GHJ');
        $rosterMember = $this->createMember('GHJ', inDms: true);

        $this->postJson(
            "/api/schedules/{$schedule->id}/members",
            ['profile_id' => $outsider->id, 'function_type' => 'instrumentalist'],
            $this->authHeadersFor($this->admin),
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_id']);

        $this->postJson(
            "/api/schedules/{$schedule->id}/members",
            ['profile_id' => $rosterMember->id, 'function_type' => 'instrumentalist'],
            $this->authHeadersFor($this->admin),
        )->assertCreated();
    }

    public function test_ghj_leader_cannot_see_update_or_delete_dms_drafts(): void
    {
        $leader = $this->createLeader('GHJ', leadsGhj: true);
        $dmsDraft = $this->createSchedule('dms');
        $ghjDraft = $this->createSchedule('ghj');

        $scheduleIds = collect(
            $this->getJson('/api/schedules', $this->authHeadersFor($leader))->assertOk()->json(),
        )->pluck('id')->all();

        $this->assertContains($ghjDraft->id, $scheduleIds);
        $this->assertNotContains($dmsDraft->id, $scheduleIds);

        $this->patchJson(
            "/api/schedules/{$dmsDraft->id}",
            ['title' => 'Alterado'],
            $this->authHeadersFor($leader),
        )->assertForbidden();

        $this->deleteJson("/api/schedules/{$dmsDraft->id}", [], $this->authHeadersFor($leader))
            ->assertForbidden();

        $this->assertDatabaseHas('schedules', ['id' => $dmsDraft->id]);
    }

    public function test_members_see_published_schedules_of_the_ministries_they_belong_to(): void
    {
        $dmsPublished = $this->createSchedule('dms', 'published');
        $ghjPublished = $this->createSchedule('ghj', 'published');
        $dmsDraft = $this->createSchedule('dms');
        $ghjDraft = $this->createSchedule('ghj');

        $dmsOnly = $this->userFor($this->createMember('Adultos', inDms: true));
        $ghjOnly = $this->userFor($this->createMember('GHJ'));
        $both = $this->userFor($this->createMember('GHJ', inDms: true));
        $dmsLeader = $this->createLeader('Adultos', leadsDms: true);
        $dmsLeader->profile->update(['in_dms' => true]);

        $this->assertSame([$dmsPublished->id], $this->visibleScheduleIds($dmsOnly));
        $this->assertSame([$ghjPublished->id], $this->visibleScheduleIds($ghjOnly));
        $this->assertEqualsCanonicalizing([$dmsPublished->id, $ghjPublished->id], $this->visibleScheduleIds($both));

        // Leaders also see their own ministry's drafts, but nothing of a ministry they're not in.
        $this->assertEqualsCanonicalizing([$dmsPublished->id, $dmsDraft->id], $this->visibleScheduleIds($dmsLeader));
        $this->assertNotContains($ghjDraft->id, $this->visibleScheduleIds($both));
    }

    public function test_members_still_see_schedules_they_are_personally_on(): void
    {
        $member = $this->createMember('Adultos', inDms: true);
        $ghjServing = $this->createSchedule('ghj', 'published');
        $ghjServing->members()->create(['profile_id' => $member->id, 'function_type' => 'instrumentalist']);

        $this->assertContains($ghjServing->id, $this->visibleScheduleIds($this->userFor($member)));
    }

    public function test_auth_payload_exposes_viewable_ministries(): void
    {
        $both = $this->userFor($this->createMember('GHJ', inDms: true));
        $ghjOnly = $this->userFor($this->createMember('GHJ'));

        $this->getJson('/api/auth/me', $this->authHeadersFor($both))
            ->assertJsonPath('viewable_ministries', ['dms', 'ghj']);
        $this->getJson('/api/auth/me', $this->authHeadersFor($ghjOnly))
            ->assertJsonPath('viewable_ministries', ['ghj']);
    }

    private function userFor(Profile $profile): User
    {
        return User::query()->findOrFail($profile->user_id);
    }

    /**
     * @return list<string>
     */
    private function visibleScheduleIds(User $user): array
    {
        return collect($this->getJson('/api/schedules', $this->authHeadersFor($user))->assertOk()->json())
            ->pluck('id')
            ->all();
    }

    public function test_create_requires_leading_the_ministry(): void
    {
        $leader = $this->createLeader('GHJ', leadsGhj: true);

        $this->postJson(
            '/api/schedules',
            ['schedule_date' => now()->addWeek()->format('Y-m-d'), 'ministry' => 'dms'],
            $this->authHeadersFor($leader),
        )->assertForbidden();

        $this->postJson(
            '/api/schedules',
            ['schedule_date' => now()->addWeek()->format('Y-m-d')],
            $this->authHeadersFor($leader),
        )
            ->assertCreated()
            ->assertJsonPath('ministry', 'ghj');
    }

    public function test_dms_leader_can_add_ghj_youth_to_dms_roster(): void
    {
        $leader = $this->createLeader('GHS', leadsDms: true);
        $youth = $this->createMember('GHJ');

        $this->patchJson(
            "/api/profiles/{$youth->id}",
            ['in_dms' => true],
            $this->authHeadersFor($leader),
        )
            ->assertOk()
            ->assertJsonPath('in_dms', true);
    }

    public function test_only_admin_can_change_ministry_leadership(): void
    {
        $leader = $this->createLeader('GHS', leadsDms: true);
        $otherLeader = $this->createLeader('GHH', leadsDms: true);

        $this->patchJson(
            "/api/profiles/{$otherLeader->profile->id}",
            ['leads_ghj' => true],
            $this->authHeadersFor($leader),
        )->assertForbidden();

        $this->patchJson(
            "/api/profiles/{$otherLeader->profile->id}",
            ['leads_ghj' => true],
            $this->authHeadersFor($this->admin),
        )
            ->assertOk()
            ->assertJsonPath('leads_ghj', true);
    }

    public function test_auth_payload_exposes_led_ministries(): void
    {
        $leader = $this->createLeader('GHJ', leadsGhj: true);

        $this->getJson('/api/auth/me', $this->authHeadersFor($leader))
            ->assertOk()
            ->assertJsonPath('led_ministries', ['ghj']);
    }

    private function createLeader(string $homeGroup, bool $leadsDms = false, bool $leadsGhj = false): User
    {
        $leader = User::factory()->create();
        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => $homeGroup,
            'leads_dms' => $leadsDms,
            'leads_ghj' => $leadsGhj,
        ]);

        UserRole::query()->where('user_id', $leader->id)->delete();
        UserRole::query()->create(['user_id' => $leader->id, 'role' => 'leader']);

        return $leader->fresh('profile');
    }

    private function createMember(string $homeGroup, bool $inDms = false): Profile
    {
        $profile = User::factory()->create()->profile()->firstOrFail();
        $profile->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => $homeGroup,
            'in_dms' => $inDms,
        ]);
        $profile->instruments()->create(['instrument' => 'guitar']);

        return $profile;
    }

    private function createSchedule(string $ministry, string $status = 'draft'): Schedule
    {
        return Schedule::query()->create([
            'schedule_date' => now()->addWeek()->format('Y-m-d'),
            'start_time' => '11:00:00',
            'status' => $status,
            'schedule_type' => 'worship',
            'ministry' => $ministry,
            'created_by' => $this->admin->id,
        ]);
    }

    /**
     * @return list<string>
     */
    private function listProfileIds(User $user, ?string $ministry = null): array
    {
        $url = '/api/profiles'.($ministry ? "?ministry={$ministry}" : '');

        return collect($this->getJson($url, $this->authHeadersFor($user))->assertOk()->json())
            ->pluck('id')
            ->all();
    }

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
