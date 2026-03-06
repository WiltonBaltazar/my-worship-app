<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_pending_profiles(): void
    {
        $admin = User::factory()->create();
        $pendingUser = User::factory()->create();
        $pendingProfile = $pendingUser->profile()->firstOrFail();

        $this->assertFalse((bool) $pendingProfile->is_approved);

        $response = $this->getJson(
            '/api/profiles?status=pending',
            $this->authHeadersFor($admin),
        );

        $response
            ->assertOk()
            ->assertJsonFragment([
                'id' => $pendingProfile->id,
                'is_approved' => false,
            ]);
    }

    public function test_non_admin_cannot_list_pending_profiles(): void
    {
        User::factory()->create(); // First user becomes admin.
        $member = User::factory()->create();
        $member->profile()->update(['is_approved' => true]);

        $response = $this->getJson(
            '/api/profiles?status=pending',
            $this->authHeadersFor($member),
        );

        $response->assertForbidden();
    }

    public function test_admin_can_approve_pending_profile(): void
    {
        $admin = User::factory()->create();
        $pendingUser = User::factory()->create();
        $pendingProfile = $pendingUser->profile()->firstOrFail();

        $this->assertFalse((bool) $pendingProfile->is_approved);

        $response = $this->patchJson(
            "/api/profiles/{$pendingProfile->id}",
            ['is_approved' => true],
            $this->authHeadersFor($admin),
        );

        $response
            ->assertOk()
            ->assertJsonPath('id', $pendingProfile->id)
            ->assertJsonPath('is_approved', true);

        $this->assertTrue((bool) Profile::query()->findOrFail($pendingProfile->id)->is_approved);
    }

    public function test_leader_can_list_pending_profiles(): void
    {
        User::factory()->create(); // First user becomes admin.
        $leader = User::factory()->create();
        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        UserRole::query()->create([
            'user_id' => $leader->id,
            'role' => 'leader',
        ]);

        $pendingUser = User::factory()->create();
        $pendingProfile = $pendingUser->profile()->firstOrFail();

        $response = $this->getJson(
            '/api/profiles?status=pending',
            $this->authHeadersFor($leader),
        );

        $response
            ->assertOk()
            ->assertJsonFragment([
                'id' => $pendingProfile->id,
                'is_approved' => false,
            ]);
    }

    public function test_leader_can_check_pending_profiles_count(): void
    {
        User::factory()->create(); // First user becomes admin.
        $leader = User::factory()->create();
        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        UserRole::query()->create([
            'user_id' => $leader->id,
            'role' => 'leader',
        ]);

        User::factory()->create();
        User::factory()->create();

        $response = $this->getJson(
            '/api/profiles/pending-count',
            $this->authHeadersFor($leader),
        );

        $response
            ->assertOk()
            ->assertJsonPath('count', 2);
    }

    public function test_leader_can_approve_pending_profile(): void
    {
        User::factory()->create(); // First user becomes admin.
        $leader = User::factory()->create();
        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        UserRole::query()->create([
            'user_id' => $leader->id,
            'role' => 'leader',
        ]);

        $pendingUser = User::factory()->create();
        $pendingProfile = $pendingUser->profile()->firstOrFail();

        $response = $this->patchJson(
            "/api/profiles/{$pendingProfile->id}",
            ['is_approved' => true],
            $this->authHeadersFor($leader),
        );

        $response
            ->assertOk()
            ->assertJsonPath('id', $pendingProfile->id)
            ->assertJsonPath('is_approved', true);

        $this->assertTrue((bool) Profile::query()->findOrFail($pendingProfile->id)->is_approved);
    }

    public function test_ghj_leader_lists_only_pending_profiles_from_ghj(): void
    {
        User::factory()->create(); // First user becomes admin.
        $leader = $this->createLeaderWithHomeGroup('GHJ');

        $ghjPending = User::factory()->create();
        $ghjPendingProfile = $ghjPending->profile()->firstOrFail();
        $ghjPendingProfile->update([
            'is_approved' => false,
            'is_active' => true,
            'home_group' => 'GHJ',
        ]);

        $ghhPending = User::factory()->create();
        $ghhPendingProfile = $ghhPending->profile()->firstOrFail();
        $ghhPendingProfile->update([
            'is_approved' => false,
            'is_active' => true,
            'home_group' => 'GHH',
        ]);

        $response = $this->getJson(
            '/api/profiles?status=pending',
            $this->authHeadersFor($leader),
        );

        $response->assertOk();

        $profileIds = collect($response->json())->pluck('id')->all();

        $this->assertContains($ghjPendingProfile->id, $profileIds);
        $this->assertNotContains($ghhPendingProfile->id, $profileIds);
    }

    public function test_ghj_leader_pending_count_is_scoped_to_ghj_profiles(): void
    {
        User::factory()->create(); // First user becomes admin.
        $leader = $this->createLeaderWithHomeGroup('GHJ');

        $ghjPending = User::factory()->create();
        $ghjPending->profile()->update([
            'is_approved' => false,
            'is_active' => true,
            'home_group' => 'GHJ',
        ]);

        $ghsPending = User::factory()->create();
        $ghsPending->profile()->update([
            'is_approved' => false,
            'is_active' => true,
            'home_group' => 'GHS',
        ]);

        $this->getJson(
            '/api/profiles/pending-count',
            $this->authHeadersFor($leader),
        )
            ->assertOk()
            ->assertJsonPath('count', 1);
    }

    public function test_ghj_leader_cannot_approve_pending_profile_from_other_home_group(): void
    {
        User::factory()->create(); // First user becomes admin.
        $leader = $this->createLeaderWithHomeGroup('GHJ');

        $pendingUser = User::factory()->create();
        $pendingProfile = $pendingUser->profile()->firstOrFail();
        $pendingProfile->update([
            'is_approved' => false,
            'is_active' => true,
            'home_group' => 'GHS',
        ]);

        $this->patchJson(
            "/api/profiles/{$pendingProfile->id}",
            ['is_approved' => true],
            $this->authHeadersFor($leader),
        )->assertForbidden();

        $this->assertFalse((bool) Profile::query()->findOrFail($pendingProfile->id)->is_approved);
    }

    public function test_ghh_leader_can_approve_pending_profile_from_other_home_group(): void
    {
        User::factory()->create(); // First user becomes admin.
        $leader = $this->createLeaderWithHomeGroup('GHH');

        $pendingUser = User::factory()->create();
        $pendingProfile = $pendingUser->profile()->firstOrFail();
        $pendingProfile->update([
            'is_approved' => false,
            'is_active' => true,
            'home_group' => 'GHJ',
        ]);

        $this->patchJson(
            "/api/profiles/{$pendingProfile->id}",
            ['is_approved' => true],
            $this->authHeadersFor($leader),
        )
            ->assertOk()
            ->assertJsonPath('is_approved', true);
    }

    public function test_admin_can_assign_member_to_home_group(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $response = $this->patchJson(
            "/api/profiles/{$memberProfile->id}",
            ['home_group' => 'GHJ'],
            $this->authHeadersFor($admin),
        );

        $response
            ->assertOk()
            ->assertJsonPath('id', $memberProfile->id)
            ->assertJsonPath('home_group', 'GHJ');

        $this->assertSame('GHJ', Profile::query()->findOrFail($memberProfile->id)->home_group);
    }

    public function test_profile_home_group_must_be_valid_value(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $this->patchJson(
            "/api/profiles/{$memberProfile->id}",
            ['home_group' => 'INVALID'],
            $this->authHeadersFor($admin),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['home_group']);
    }

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . $user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }

    private function createLeaderWithHomeGroup(string $homeGroup): User
    {
        $leader = User::factory()->create();
        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => $homeGroup,
        ]);

        UserRole::query()->create([
            'user_id' => $leader->id,
            'role' => 'leader',
        ]);

        return $leader;
    }
}
