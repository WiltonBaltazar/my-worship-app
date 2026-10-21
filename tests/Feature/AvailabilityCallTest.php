<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\Schedule;
use App\Models\User;
use App\Models\UserRole;
use App\Services\PushNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvailabilityCallTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(); // First user becomes admin.
    }

    public function test_opening_a_call_notifies_only_the_schedule_ministry_pool(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $dmsMember = $this->createMember('Adultos', inDms: true);
        $ghjOnlyMember = $this->createMember('GHJ');
        $schedule = $this->createSchedule('dms');

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))
            ->assertOk()
            ->assertJsonPath('is_open', true);

        $notified = AppNotification::query()->where('type', 'availability_call')->pluck('user_id')->all();

        $this->assertContains($dmsMember->user_id, $notified);
        $this->assertNotContains($ghjOnlyMember->user_id, $notified);
        $this->assertNotContains($leader->id, $notified);
        $this->assertNotContains($this->admin->id, $notified);

        // Re-opening an already open call (e.g. to change the deadline) must not re-notify.
        $this->postJson(
            "/api/schedules/{$schedule->id}/availability-call",
            ['deadline' => now()->addDays(2)->toISOString()],
            $this->authHeadersFor($leader),
        )->assertOk();

        $this->assertSame(count($notified), AppNotification::query()->where('type', 'availability_call')->count());
    }

    public function test_only_leaders_of_the_ministry_can_open_or_view_responses(): void
    {
        $ghjLeader = $this->createLeader('GHJ', leadsGhj: true);
        $schedule = $this->createSchedule('dms');

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($ghjLeader))
            ->assertForbidden();
        $this->getJson("/api/schedules/{$schedule->id}/availability-call", $this->authHeadersFor($ghjLeader))
            ->assertForbidden();
    }

    public function test_pool_member_responds_and_leader_sees_answers(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $member = $this->createMember('Adultos', inDms: true);
        $memberUser = User::query()->findOrFail($member->user_id);
        $schedule = $this->createSchedule('dms');

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))->assertOk();

        $this->getJson('/api/availability-calls', $this->authHeadersFor($memberUser))
            ->assertOk()
            ->assertJsonPath('0.schedule_id', $schedule->id)
            ->assertJsonPath('0.my_response', null);

        $this->putJson("/api/schedules/{$schedule->id}/availability", ['available' => true], $this->authHeadersFor($memberUser))
            ->assertOk();

        $this->getJson('/api/availability-calls', $this->authHeadersFor($memberUser))
            ->assertJsonPath('0.my_response', true);

        $this->getJson("/api/schedules/{$schedule->id}/availability-call", $this->authHeadersFor($leader))
            ->assertOk()
            ->assertJsonPath('responses.0.profile.id', $member->id)
            ->assertJsonPath('responses.0.available', true)
            ->assertJsonPath('responses.0.profile.instruments', ['guitar']);
    }

    public function test_members_outside_the_pool_cannot_see_or_answer(): void
    {
        $leader = $this->createLeader('GHJ', leadsGhj: true);
        $dmsOnly = $this->createMember('Adultos', inDms: true);
        $dmsUser = User::query()->findOrFail($dmsOnly->user_id);
        $schedule = $this->createSchedule('ghj');

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))->assertOk();

        $this->getJson('/api/availability-calls', $this->authHeadersFor($dmsUser))->assertOk()->assertJsonCount(0);
        $this->putJson("/api/schedules/{$schedule->id}/availability", ['available' => true], $this->authHeadersFor($dmsUser))
            ->assertForbidden();
    }

    public function test_closed_or_expired_calls_reject_answers(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $member = $this->createMember('Adultos', inDms: true);
        $memberUser = User::query()->findOrFail($member->user_id);
        $schedule = $this->createSchedule('dms');

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))->assertOk();
        $this->deleteJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))
            ->assertOk()
            ->assertJsonPath('is_open', false);

        $this->putJson("/api/schedules/{$schedule->id}/availability", ['available' => true], $this->authHeadersFor($memberUser))
            ->assertUnprocessable();

        $expired = $this->createSchedule('dms');
        $expired->update(['call_opened_at' => now()->subDay(), 'call_deadline' => now()->subMinute()]);

        $this->getJson('/api/availability-calls', $this->authHeadersFor($memberUser))->assertJsonCount(0);
        $this->putJson("/api/schedules/{$expired->id}/availability", ['available' => true], $this->authHeadersFor($memberUser))
            ->assertUnprocessable();
    }

    public function test_opening_a_call_sends_web_push_to_pool_members(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $member = $this->createMember('Adultos', inDms: true);
        $schedule = $this->createSchedule('dms');

        $pushed = $this->capturePushes();

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))->assertOk();

        $this->assertTrue(
            $pushed->contains(fn (AppNotification $n) => $n->user_id === $member->user_id && $n->type === 'availability_call'),
        );
    }

    public function test_volunteer_added_to_draft_schedule_gets_push(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $volunteer = $this->createMember('Adultos', inDms: true);
        $other = $this->createMember('Adultos', inDms: true);
        $schedule = $this->createSchedule('dms');

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))->assertOk();
        $this->putJson(
            "/api/schedules/{$schedule->id}/availability",
            ['available' => true],
            $this->authHeadersFor(User::query()->findOrFail($volunteer->user_id)),
        )->assertOk();

        $pushed = $this->capturePushes();

        foreach ([$volunteer, $other] as $profile) {
            $this->postJson("/api/schedules/{$schedule->id}/members", [
                'profile_id' => $profile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ], $this->authHeadersFor($leader))->assertCreated();
        }

        $recipients = $pushed->where('title', 'Você foi escalado(a)!')->pluck('user_id')->all();

        $this->assertSame([$volunteer->user_id], $recipients);
    }

    public function test_answer_is_locked_once_the_member_is_on_the_schedule(): void
    {
        $leader = $this->createLeader('Adultos', leadsDms: true);
        $member = $this->createMember('Adultos', inDms: true);
        $memberUser = User::query()->findOrFail($member->user_id);
        $schedule = $this->createSchedule('dms');

        $this->postJson("/api/schedules/{$schedule->id}/availability-call", [], $this->authHeadersFor($leader))->assertOk();

        // Changing your mind before being added is fine.
        $this->putJson("/api/schedules/{$schedule->id}/availability", ['available' => true], $this->authHeadersFor($memberUser))->assertOk();
        $this->putJson("/api/schedules/{$schedule->id}/availability", ['available' => false], $this->authHeadersFor($memberUser))->assertOk();
        $this->putJson("/api/schedules/{$schedule->id}/availability", ['available' => true], $this->authHeadersFor($memberUser))->assertOk();

        $this->postJson("/api/schedules/{$schedule->id}/members", [
            'profile_id' => $member->id,
            'function_type' => 'instrumentalist',
        ], $this->authHeadersFor($leader))->assertCreated();

        $this->putJson("/api/schedules/{$schedule->id}/availability", ['available' => false], $this->authHeadersFor($memberUser))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['available']);

        $this->assertDatabaseHas('schedule_availability_responses', [
            'schedule_id' => $schedule->id,
            'profile_id' => $member->id,
            'available' => true,
        ]);
    }

    /**
     * Swaps the push service for a recorder of the notifications it would send.
     *
     * @return \Illuminate\Support\Collection<int, AppNotification>
     */
    private function capturePushes(): \Illuminate\Support\Collection
    {
        $pushed = collect();

        $this->mock(PushNotificationService::class, function ($mock) use ($pushed): void {
            $mock->shouldReceive('sendForNotification')
                ->andReturnUsing(fn (AppNotification $notification) => $pushed->push($notification));
        });

        return $pushed;
    }

    private function createLeader(string $homeGroup, bool $leadsDms = false, bool $leadsGhj = false): User
    {
        $leader = User::factory()->create();
        $leader->profile()->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => $homeGroup,
            'in_dms' => $homeGroup !== 'GHJ',
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

    private function createSchedule(string $ministry): Schedule
    {
        return Schedule::query()->create([
            'schedule_date' => now()->addWeek()->format('Y-m-d'),
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
