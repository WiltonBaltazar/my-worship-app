<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_join_request_can_include_member_skills(): void
    {
        User::factory()->create(); // First account becomes approved admin.

        $response = $this->postJson('/api/auth/register', [
            'name' => 'New Member',
            'email' => 'member@example.com',
            'password' => 'password',
            'can_lead' => true,
            'instruments' => ['guitar', 'drums'],
            'voices' => ['tenor', 'lead'],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('requires_approval', true)
            ->assertJsonStructure(['requires_approval', 'profile_id', 'message']);

        $user = User::query()->where('email', 'member@example.com')->firstOrFail();
        $profile = Profile::query()
            ->with(['instruments', 'voices'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        $this->assertFalse((bool) $profile->is_approved);
        $this->assertTrue((bool) $profile->can_lead);
        $this->assertSame(['drums', 'guitar'], $profile->instruments->pluck('instrument')->sort()->values()->all());
        $this->assertSame(['lead', 'tenor'], $profile->voices->pluck('voice_type')->sort()->values()->all());
    }

    public function test_join_request_notifies_admin_and_leader(): void
    {
        $admin = User::factory()->create(); // First account becomes approved admin.
        $leader = User::factory()->create();

        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        UserRole::query()->create([
            'user_id' => $leader->id,
            'role' => 'leader',
        ]);

        $this->postJson('/api/auth/register', [
            'name' => 'Pending Member',
            'email' => 'pending.member@example.com',
            'password' => 'password',
        ])->assertCreated()
            ->assertJsonPath('requires_approval', true);

        $newUser = User::query()->where('email', 'pending.member@example.com')->firstOrFail();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type' => 'approval_request',
            'title' => 'Nova solicitação de acesso',
            'message' => 'Pending Member solicitou acesso ao sistema.',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $leader->id,
            'type' => 'approval_request',
            'title' => 'Nova solicitação de acesso',
            'message' => 'Pending Member solicitou acesso ao sistema.',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $newUser->id,
            'type' => 'approval_request',
        ]);

        $this->assertSame(
            2,
            AppNotification::query()
                ->where('type', 'approval_request')
                ->where('message', 'Pending Member solicitou acesso ao sistema.')
                ->count(),
        );
    }
}
