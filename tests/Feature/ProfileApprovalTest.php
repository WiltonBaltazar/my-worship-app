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

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . $user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
