<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\Schedule;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleGuestTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(); // First user becomes admin.
    }

    public function test_leader_adds_edits_and_removes_guest(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $schedule = $this->createSchedule('dms');

        $guestId = $this->postJson("/api/schedules/{$schedule->id}/guests", [
            'name' => 'Maria Cossa',
            'role' => 'Cantar',
            'song_title' => 'Grande é o Senhor',
            'song_url' => 'https://www.youtube.com/watch?v=abc123',
        ], $this->authHeadersFor($leader))
            ->assertCreated()
            ->assertJsonPath('name', 'Maria Cossa')
            ->json('id');

        $this->getJson('/api/schedules', $this->authHeadersFor($leader))
            ->assertOk()
            ->assertJsonPath('0.guests.0.song_title', 'Grande é o Senhor');

        $this->patchJson("/api/schedule-guests/{$guestId}", [
            'name' => 'Maria Cossa',
            'role' => 'Cantar e ministrar',
            'notes' => 'Chega às 10h',
        ], $this->authHeadersFor($leader))
            ->assertOk()
            ->assertJsonPath('role', 'Cantar e ministrar')
            ->assertJsonPath('song_title', null);

        $this->deleteJson("/api/schedule-guests/{$guestId}", [], $this->authHeadersFor($leader))->assertOk();
        $this->assertDatabaseMissing('schedule_guests', ['id' => $guestId]);
    }

    public function test_guest_requires_name_role_and_a_valid_link(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $schedule = $this->createSchedule('dms');

        $this->postJson("/api/schedules/{$schedule->id}/guests", [
            'song_url' => 'javascript:alert(1)',
        ], $this->authHeadersFor($leader))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'role', 'song_url']);
    }

    public function test_only_leaders_of_the_schedule_ministry_manage_guests(): void
    {
        $ghjLeader = $this->createLeader('GHJ', leadsGhj: true);
        $dmsLeader = $this->createLeader('Adultos', leadsDms: true);
        $member = User::factory()->create();
        $schedule = $this->createSchedule('dms');

        $payload = ['name' => 'Convidado', 'role' => 'Pregar'];

        $this->postJson("/api/schedules/{$schedule->id}/guests", $payload, $this->authHeadersFor($ghjLeader))->assertForbidden();
        $this->postJson("/api/schedules/{$schedule->id}/guests", $payload, $this->authHeadersFor($member))->assertForbidden();

        $guestId = $this->postJson("/api/schedules/{$schedule->id}/guests", $payload, $this->authHeadersFor($dmsLeader))
            ->assertCreated()
            ->json('id');

        $this->deleteJson("/api/schedule-guests/{$guestId}", [], $this->authHeadersFor($ghjLeader))->assertForbidden();
    }

    public function test_member_can_present_and_sees_it_in_their_schedules(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $member = $this->createMember('Adultos', inDms: true);
        $memberUser = User::query()->findOrFail($member->user_id);
        $schedule = $this->createSchedule('dms', 'published');

        $this->postJson("/api/schedules/{$schedule->id}/guests", [
            'profile_id' => $member->id,
            'role' => 'Poema',
            'song_title' => 'Salmo 23',
        ], $this->authHeadersFor($leader))
            ->assertCreated()
            ->assertJsonPath('profile_id', $member->id)
            ->assertJsonPath('name', $member->name);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->user_id,
            'schedule_id' => $schedule->id,
            'title' => 'Participação especial',
        ]);

        $this->getJson('/api/schedules/me', $this->authHeadersFor($memberUser))
            ->assertOk()
            ->assertJsonPath('0.id', $schedule->id)
            ->assertJsonPath('0.guests.0.profile_id', $member->id);
    }

    public function test_presenting_member_on_ghj_schedule_can_see_it(): void
    {
        $leader = $this->createLeader('GHJ', leadsGhj: true);
        $youth = $this->createMember('GHJ');
        $schedule = $this->createSchedule('ghj', 'published');

        $this->postJson("/api/schedules/{$schedule->id}/guests", [
            'profile_id' => $youth->id,
            'role' => 'Dança',
        ], $this->authHeadersFor($leader))->assertCreated();

        $ids = collect($this->getJson('/api/schedules', $this->authHeadersFor(User::query()->findOrFail($youth->user_id)))->json())
            ->pluck('id')->all();

        $this->assertContains($schedule->id, $ids);
    }

    public function test_member_presenter_must_belong_to_the_schedule_ministry(): void
    {
        $leader = $this->createLeader('GHJ', leadsGhj: true);
        $dmsOnly = $this->createMember('Adultos', inDms: true);
        $schedule = $this->createSchedule('ghj');

        $this->postJson("/api/schedules/{$schedule->id}/guests", [
            'profile_id' => $dmsOnly->id,
            'role' => 'Cantar',
        ], $this->authHeadersFor($leader))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_id']);
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

        return $profile->fresh();
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

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
