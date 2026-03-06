<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Song;
use App\Models\SubstituteRequest;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleEligibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_profile_cannot_be_added_to_schedule(): void
    {
        $admin = User::factory()->create();
        $adminProfile = $admin->profile()->firstOrFail();

        $scheduleId = $this->createSchedule($admin);

        $response = $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $adminProfile->id,
                'function_type' => 'lead_vocal',
                'function_detail' => 'Voz Principal (Dirigente)',
            ],
            $this->authHeadersFor($admin),
        );

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_id']);

        $this->assertDatabaseMissing('schedule_members', [
            'schedule_id' => $scheduleId,
            'profile_id' => $adminProfile->id,
        ]);
    }

    public function test_leader_can_add_self_to_schedule(): void
    {
        $admin = User::factory()->create();
        $leader = User::factory()->create();
        $leaderProfile = $leader->profile()->firstOrFail();

        $leaderProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        UserRole::query()->create([
            'user_id' => $leader->id,
            'role' => 'leader',
        ]);

        $scheduleId = $this->createSchedule($admin);

        $response = $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $leaderProfile->id,
                'function_type' => 'lead_vocal',
                'function_detail' => 'Voz Principal (Dirigente)',
            ],
            $this->authHeadersFor($leader),
        );

        $response
            ->assertCreated()
            ->assertJsonPath('profile_id', $leaderProfile->id);

        $this->assertDatabaseHas('schedule_members', [
            'schedule_id' => $scheduleId,
            'profile_id' => $leaderProfile->id,
        ]);
    }

    public function test_ghj_leader_cannot_add_member_from_other_home_group(): void
    {
        $admin = User::factory()->create();
        $leader = $this->createLeaderWithHomeGroup('GHJ');

        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();
        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => 'GHH',
        ]);
        $memberProfile->instruments()->create(['instrument' => 'guitar']);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($leader),
        )->assertForbidden();

        $this->assertDatabaseMissing('schedule_members', [
            'schedule_id' => $scheduleId,
            'profile_id' => $memberProfile->id,
        ]);
    }

    public function test_ghj_leader_can_add_member_from_ghj(): void
    {
        $admin = User::factory()->create();
        $leader = $this->createLeaderWithHomeGroup('GHJ');

        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();
        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => 'GHJ',
        ]);
        $memberProfile->instruments()->create(['instrument' => 'guitar']);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($leader),
        )
            ->assertCreated()
            ->assertJsonPath('profile_id', $memberProfile->id);
    }

    public function test_ghs_leader_can_add_member_from_any_home_group(): void
    {
        $admin = User::factory()->create();
        $leader = $this->createLeaderWithHomeGroup('GHS');

        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();
        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
            'home_group' => 'GHH',
        ]);
        $memberProfile->instruments()->create(['instrument' => 'guitar']);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($leader),
        )
            ->assertCreated()
            ->assertJsonPath('profile_id', $memberProfile->id);
    }

    public function test_member_marked_unavailable_cannot_be_added_to_schedule_on_same_date(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleDate = now()->addWeek()->format('Y-m-d');

        $memberProfile->unavailableDates()->create([
            'unavailable_date' => $scheduleDate,
        ]);

        $scheduleId = $this->createSchedule($admin, $scheduleDate);

        $response = $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        );

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_id']);

        $this->assertDatabaseMissing('schedule_members', [
            'schedule_id' => $scheduleId,
            'profile_id' => $memberProfile->id,
        ]);
    }

    public function test_sound_tech_only_member_cannot_be_added_to_normal_schedule(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
            'can_be_tech_sound' => true,
            'can_be_tech_lead' => false,
            'can_be_tech_streaming' => false,
            'can_lead' => false,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_id']);

        $this->assertDatabaseMissing('schedule_members', [
            'schedule_id' => $scheduleId,
            'profile_id' => $memberProfile->id,
        ]);
    }

    public function test_sound_tech_member_with_voice_can_be_added_to_normal_schedule(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
            'can_be_tech_sound' => true,
            'can_be_tech_lead' => false,
            'can_be_tech_streaming' => false,
            'can_lead' => false,
        ]);

        $memberProfile->voices()->create([
            'voice_type' => 'alto',
        ]);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'backing_vocal',
                'function_detail' => 'Segunda Voz (Alto/Contralto)',
            ],
            $this->authHeadersFor($admin),
        )
            ->assertCreated()
            ->assertJsonPath('profile_id', $memberProfile->id);

        $this->assertDatabaseHas('schedule_members', [
            'schedule_id' => $scheduleId,
            'profile_id' => $memberProfile->id,
            'function_type' => 'backing_vocal',
        ]);
    }

    public function test_unavailable_candidate_cannot_accept_substitute_request_for_same_date(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $candidate = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();
        $candidateProfile = $candidate->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $candidateProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleDate = now()->addWeek()->format('Y-m-d');

        $candidateProfile->unavailableDates()->create([
            'unavailable_date' => $scheduleDate,
        ]);

        $scheduleId = $this->createSchedule($admin, $scheduleDate);

        $scheduleMemberId = (string) $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )
            ->assertCreated()
            ->json('id');

        $this->postJson(
            '/api/substitute-requests',
            [
                'schedule_member_id' => $scheduleMemberId,
                'candidate_profile_ids' => [$candidateProfile->id],
            ],
            $this->authHeadersFor($member),
        )->assertCreated();

        $requestId = (string) SubstituteRequest::query()->firstOrFail()->id;

        $this->postJson(
            "/api/substitute-requests/{$requestId}/accept",
            [],
            $this->authHeadersFor($candidate),
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['candidate_profile_id']);

        $this->assertDatabaseHas('schedule_members', [
            'id' => $scheduleMemberId,
            'profile_id' => $memberProfile->id,
        ]);

        $this->assertDatabaseMissing('schedule_members', [
            'schedule_id' => $scheduleId,
            'profile_id' => $candidateProfile->id,
        ]);

        $this->assertDatabaseHas('substitute_requests', [
            'id' => $requestId,
            'status' => 'pending',
        ]);
    }

    public function test_sound_tech_only_candidate_cannot_accept_substitute_for_normal_schedule(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $candidate = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();
        $candidateProfile = $candidate->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $memberProfile->instruments()->create([
            'instrument' => 'guitar',
        ]);

        $candidateProfile->update([
            'is_approved' => true,
            'is_active' => true,
            'can_be_tech_sound' => true,
            'can_be_tech_lead' => false,
            'can_be_tech_streaming' => false,
            'can_lead' => false,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $scheduleMemberId = (string) $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )
            ->assertCreated()
            ->json('id');

        $this->postJson(
            '/api/substitute-requests',
            [
                'schedule_member_id' => $scheduleMemberId,
                'candidate_profile_ids' => [$candidateProfile->id],
            ],
            $this->authHeadersFor($member),
        )->assertCreated();

        $requestId = (string) SubstituteRequest::query()->firstOrFail()->id;

        $this->postJson(
            "/api/substitute-requests/{$requestId}/accept",
            [],
            $this->authHeadersFor($candidate),
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['candidate_profile_id']);

        $this->assertDatabaseHas('schedule_members', [
            'id' => $scheduleMemberId,
            'profile_id' => $memberProfile->id,
        ]);

        $this->assertDatabaseHas('substitute_requests', [
            'id' => $requestId,
            'status' => 'pending',
        ]);
    }

    public function test_substitute_candidates_cannot_include_admin_profiles(): void
    {
        $admin = User::factory()->create();
        $adminProfile = $admin->profile()->firstOrFail();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $addMemberResponse = $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $scheduleMemberId = $addMemberResponse->json('id');

        $response = $this->postJson(
            '/api/substitute-requests',
            [
                'schedule_member_id' => $scheduleMemberId,
                'candidate_profile_ids' => [$adminProfile->id],
            ],
            $this->authHeadersFor($member),
        );

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['candidate_profile_ids']);

        $this->assertDatabaseCount('substitute_requests', 0);
    }

    public function test_lideranca_escolhe_notifies_admin_and_leader(): void
    {
        $admin = User::factory()->create();
        $leader = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        UserRole::query()->create([
            'user_id' => $leader->id,
            'role' => 'leader',
        ]);

        $scheduleId = $this->createSchedule($admin);

        $addMemberResponse = $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $scheduleMemberId = (string) $addMemberResponse->json('id');

        $this->postJson(
            '/api/substitute-requests',
            [
                'schedule_member_id' => $scheduleMemberId,
                'candidate_profile_ids' => [],
            ],
            $this->authHeadersFor($member),
        )->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'schedule_id' => $scheduleId,
            'type' => 'change_request',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $leader->id,
            'schedule_id' => $scheduleId,
            'type' => 'change_request',
        ]);
    }

    public function test_user_is_notified_only_after_schedule_is_published(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $scheduleId,
            'title' => 'Nova escala para você',
            'type' => 'schedule',
        ]);

        $this->patchJson(
            "/api/schedules/{$scheduleId}",
            ['status' => 'published'],
            $this->authHeadersFor($admin),
        )->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $scheduleId,
            'title' => 'Nova escala para você',
            'type' => 'schedule',
        ]);
    }

    public function test_only_new_additions_after_publish_are_notified(): void
    {
        $admin = User::factory()->create();
        $firstMember = User::factory()->create();
        $secondMember = User::factory()->create();
        $firstProfile = $firstMember->profile()->firstOrFail();
        $secondProfile = $secondMember->profile()->firstOrFail();

        $firstProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $secondProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $firstProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $this->patchJson(
            "/api/schedules/{$scheduleId}",
            ['status' => 'published'],
            $this->authHeadersFor($admin),
        )->assertOk();

        $this->assertSame(
            1,
            AppNotification::query()
                ->where('user_id', $firstMember->id)
                ->where('schedule_id', $scheduleId)
                ->where('title', 'Nova escala para você')
                ->where('type', 'schedule')
                ->count(),
        );

        $this->assertSame(
            0,
            AppNotification::query()
                ->where('user_id', $secondMember->id)
                ->where('schedule_id', $scheduleId)
                ->where('title', 'Nova escala para você')
                ->where('type', 'schedule')
                ->count(),
        );

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $secondProfile->id,
                'function_type' => 'backing_vocal',
                'function_detail' => 'Primeira Voz (Soprano)',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $this->assertSame(
            1,
            AppNotification::query()
                ->where('user_id', $firstMember->id)
                ->where('schedule_id', $scheduleId)
                ->where('title', 'Nova escala para você')
                ->where('type', 'schedule')
                ->count(),
        );

        $this->assertSame(
            1,
            AppNotification::query()
                ->where('user_id', $secondMember->id)
                ->where('schedule_id', $scheduleId)
                ->where('title', 'Nova escala para você')
                ->where('type', 'schedule')
                ->count(),
        );
    }

    public function test_user_is_notified_when_removed_from_published_schedule(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $addMemberResponse = $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $scheduleMemberId = (string) $addMemberResponse->json('id');

        $this->patchJson(
            "/api/schedules/{$scheduleId}",
            ['status' => 'published'],
            $this->authHeadersFor($admin),
        )->assertOk();

        $this->deleteJson(
            "/api/schedule-members/{$scheduleMemberId}",
            [],
            $this->authHeadersFor($admin),
        )->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $scheduleId,
            'title' => 'Removido da escala',
            'type' => 'schedule',
        ]);
    }

    public function test_removing_requested_member_notifies_user_and_clears_resolved_request_notifications(): void
    {
        $admin = User::factory()->create();
        $leader = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        UserRole::query()->create([
            'user_id' => $leader->id,
            'role' => 'leader',
        ]);

        $scheduleId = $this->createSchedule($admin);

        $addMemberResponse = $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $scheduleMemberId = (string) $addMemberResponse->json('id');

        $this->postJson(
            '/api/substitute-requests',
            [
                'schedule_member_id' => $scheduleMemberId,
                'candidate_profile_ids' => [],
            ],
            $this->authHeadersFor($member),
        )->assertCreated();

        $changeRequestMessage = $member->name . ' solicitou troca e precisa de um substituto.';

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'schedule_id' => $scheduleId,
            'type' => 'change_request',
            'message' => $changeRequestMessage,
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $leader->id,
            'schedule_id' => $scheduleId,
            'type' => 'change_request',
            'message' => $changeRequestMessage,
        ]);

        $this->deleteJson(
            "/api/schedule-members/{$scheduleMemberId}",
            [],
            $this->authHeadersFor($admin),
        )->assertOk();

        $this->assertDatabaseMissing('schedule_members', [
            'id' => $scheduleMemberId,
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $scheduleId,
            'type' => 'change_request',
            'title' => 'Solicitação de troca resolvida',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $admin->id,
            'schedule_id' => $scheduleId,
            'type' => 'change_request',
            'message' => $changeRequestMessage,
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $leader->id,
            'schedule_id' => $scheduleId,
            'type' => 'change_request',
            'message' => $changeRequestMessage,
        ]);
    }

    public function test_lead_vocal_can_sync_schedule_songs(): void
    {
        $admin = User::factory()->create();
        $lead = User::factory()->create();
        $leadProfile = $lead->profile()->firstOrFail();

        $leadProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $leadProfile->id,
                'function_type' => 'lead_vocal',
                'function_detail' => 'Voz Principal (Dirigente)',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $song = Song::query()->create([
            'title' => 'Música de Teste',
            'created_by' => $admin->id,
        ]);

        $this->postJson(
            "/api/schedules/{$scheduleId}/songs",
            [
                'songs' => [
                    [
                        'song_id' => $song->id,
                        'order_position' => 0,
                    ],
                ],
            ],
            $this->authHeadersFor($lead),
        )->assertOk();

        $this->assertDatabaseHas('schedule_songs', [
            'schedule_id' => $scheduleId,
            'song_id' => $song->id,
        ]);
    }

    public function test_regular_member_without_edit_privilege_cannot_sync_schedule_songs(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $song = Song::query()->create([
            'title' => 'Música de Teste',
            'created_by' => $admin->id,
        ]);

        $this->postJson(
            "/api/schedules/{$scheduleId}/songs",
            [
                'songs' => [
                    [
                        'song_id' => $song->id,
                        'order_position' => 0,
                    ],
                ],
            ],
            $this->authHeadersFor($member),
        )->assertForbidden();
    }

    public function test_lead_vocal_can_grant_edit_permission_for_member_on_same_schedule(): void
    {
        $admin = User::factory()->create();
        $lead = User::factory()->create();
        $editor = User::factory()->create();
        $leadProfile = $lead->profile()->firstOrFail();
        $editorProfile = $editor->profile()->firstOrFail();

        $leadProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $editorProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleId = $this->createSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $leadProfile->id,
                'function_type' => 'lead_vocal',
                'function_detail' => 'Voz Principal (Dirigente)',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $editorMembershipResponse = $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $editorProfile->id,
                'function_type' => 'backing_vocal',
                'function_detail' => 'Primeira Voz (Soprano)',
            ],
            $this->authHeadersFor($admin),
        )->assertCreated();

        $editorMembershipId = (string) $editorMembershipResponse->json('id');

        $this->patchJson(
            "/api/schedule-members/{$editorMembershipId}",
            [
                'can_edit' => true,
            ],
            $this->authHeadersFor($lead),
        )
            ->assertOk()
            ->assertJsonPath('can_edit', true);

        $song = Song::query()->create([
            'title' => 'Música de Teste',
            'created_by' => $admin->id,
        ]);

        $this->postJson(
            "/api/schedules/{$scheduleId}/songs",
            [
                'songs' => [
                    [
                        'song_id' => $song->id,
                        'order_position' => 0,
                    ],
                ],
            ],
            $this->authHeadersFor($editor),
        )->assertOk();
    }

    private function createSchedule(User $actor, ?string $scheduleDate = null): string
    {
        $response = $this->postJson(
            '/api/schedules',
            [
                'schedule_date' => $scheduleDate ?? now()->addWeek()->format('Y-m-d'),
                'start_time' => '11:00:00',
                'status' => 'draft',
                'schedule_type' => 'worship',
            ],
            $this->authHeadersFor($actor),
        );

        $response->assertCreated();

        return (string) $response->json('id');
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
