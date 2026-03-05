<?php

namespace Tests\Feature;

use App\Models\TechnicalSchedule;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TechnicalScheduleOptimizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_valid_schedule_with_distinct_roles_per_week(): void
    {
        $manager = User::factory()->create();

        $this->createTechnician(true, true, true);
        $this->createTechnician(true, true, true);
        $this->createTechnician(false, true, true);
        $this->createTechnician(false, true, true);

        $startDate = '2030-03-04';

        $response = $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => $startDate,
                'weeks' => 4,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        );

        $response
            ->assertOk()
            ->assertJsonPath('simulated', true);

        $weeks = $response->json('weeks');
        $this->assertCount(4, $weeks);

        foreach ($weeks as $week) {
            $this->assertNotEmpty($week['lead_profile_id']);
            $this->assertNotEmpty($week['sound_profile_id']);
            $this->assertNotEmpty($week['streaming_profile_id']);

            $currentWeekTechnicians = [
                $week['lead_profile_id'],
                $week['sound_profile_id'],
                $week['streaming_profile_id'],
            ];

            $this->assertSame(
                3,
                count(array_unique($currentWeekTechnicians)),
            );
        }
    }

    public function test_ineligible_technician_never_appears_in_restricted_role(): void
    {
        $manager = User::factory()->create();
        $ineligibleLead = $this->createTechnician(false, true, true);
        $this->createTechnician(true, true, true);
        $this->createTechnician(true, true, true);
        $this->createTechnician(false, true, true);
        $this->createTechnician(false, true, true);

        $startDate = '2030-03-04';

        $response = $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => $startDate,
                'weeks' => 3,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )->assertOk();

        foreach ($response->json('weeks') as $week) {
            $this->assertNotSame($ineligibleLead->id, $week['lead_profile_id']);
        }
    }

    public function test_generation_rejects_past_start_date(): void
    {
        $manager = User::factory()->create();

        $this->createTechnician(true, true, true);
        $this->createTechnician(true, true, true);
        $this->createTechnician(true, true, true);

        $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => now()->subDay()->format('Y-m-d'),
                'weeks' => 1,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_date']);
    }

    public function test_update_allows_assignment_that_previously_violated_rest_rule(): void
    {
        $manager = User::factory()->create();
        $techA = $this->createTechnician(true, true, false);
        $techB = $this->createTechnician(true, true, false);
        $techC = $this->createTechnician(false, false, true);

        $start = now()->addWeek()->startOfWeek();

        TechnicalSchedule::query()->create([
            'week_start_date' => $start->format('Y-m-d'),
            'lead_profile_id' => $techB->id,
            'sound_profile_id' => $techA->id,
            'streaming_profile_id' => $techC->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $secondWeek = TechnicalSchedule::query()->create([
            'week_start_date' => $start->copy()->addWeek()->format('Y-m-d'),
            'lead_profile_id' => $techB->id,
            'sound_profile_id' => $techA->id,
            'streaming_profile_id' => $techC->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $this->patchJson(
            "/api/technical-schedules/{$secondWeek->id}",
            [
                'lead_profile_id' => $techA->id,
                'sound_profile_id' => $techB->id,
                'streaming_profile_id' => $techC->id,
            ],
            $this->authHeadersFor($manager),
        )
            ->assertOk()
            ->assertJsonPath('lead_profile_id', $techA->id)
            ->assertJsonPath('sound_profile_id', $techB->id)
            ->assertJsonPath('streaming_profile_id', $techC->id);
    }

    public function test_generation_with_insufficient_people_returns_controlled_exception(): void
    {
        $manager = User::factory()->create();
        $this->createTechnician(true, true, true);
        $this->createTechnician(true, true, true);

        $startDate = now()->addWeek()->startOfWeek()->format('Y-m-d');

        $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => $startDate,
                'weeks' => 2,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['weeks']);
    }

    public function test_ghj_generation_does_not_require_streaming_assignment(): void
    {
        $manager = User::factory()->create();
        $lead = $this->createTechnician(true, false, false, 'GHJ');
        $sound = $this->createTechnician(false, true, false, 'GHJ');

        $response = $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => '2030-03-11',
                'weeks' => 2,
                'simulate' => true,
                'schedule_type' => 'ghj',
            ],
            $this->authHeadersFor($manager),
        )->assertOk();

        foreach ($response->json('weeks') as $week) {
            $this->assertSame($lead->id, $week['lead_profile_id']);
            $this->assertSame($sound->id, $week['sound_profile_id']);
            $this->assertNull($week['streaming_profile_id']);
        }
    }

    public function test_ghj_generation_uses_only_ghj_technicians(): void
    {
        $manager = User::factory()->create();

        $ghjLead = $this->createTechnician(true, false, false, 'GHJ');
        $ghjSound = $this->createTechnician(false, true, false, 'GHJ');
        $nonGhjLead = $this->createTechnician(true, true, true, 'GHH');
        $nonGhjSound = $this->createTechnician(true, true, true, 'GHS');

        $response = $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => '2030-03-11',
                'weeks' => 1,
                'simulate' => true,
                'schedule_type' => 'ghj',
            ],
            $this->authHeadersFor($manager),
        )->assertOk();

        $week = $response->json('weeks.0');
        $assignedIds = array_filter([
            $week['lead_profile_id'] ?? null,
            $week['sound_profile_id'] ?? null,
            $week['streaming_profile_id'] ?? null,
        ]);

        $this->assertContains($ghjLead->id, $assignedIds);
        $this->assertContains($ghjSound->id, $assignedIds);
        $this->assertNotContains($nonGhjLead->id, $assignedIds);
        $this->assertNotContains($nonGhjSound->id, $assignedIds);
    }

    public function test_ghj_week_update_rejects_non_ghj_technician(): void
    {
        $manager = User::factory()->create();
        $ghjLead = $this->createTechnician(true, false, false, 'GHJ');
        $ghjSound = $this->createTechnician(false, true, false, 'GHJ');
        $nonGhjLead = $this->createTechnician(true, true, true, 'GHH');

        $week = TechnicalSchedule::query()->create([
            'week_start_date' => '2030-03-11',
            'schedule_type' => 'ghj',
            'lead_profile_id' => $ghjLead->id,
            'sound_profile_id' => $ghjSound->id,
            'streaming_profile_id' => null,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $this->patchJson(
            "/api/technical-schedules/{$week->id}",
            [
                'lead_profile_id' => $nonGhjLead->id,
            ],
            $this->authHeadersFor($manager),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['lead_profile_id']);
    }

    public function test_public_worship_generation_still_requires_streaming_eligible_technician(): void
    {
        $manager = User::factory()->create();
        $this->createTechnician(true, false, false);
        $this->createTechnician(false, true, false);

        $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => '2030-03-11',
                'weeks' => 1,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['weeks']);
    }

    public function test_normal_schedule_does_not_accept_sound_tech_function_type_anymore(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $memberProfile->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $scheduleId = $this->createWorshipSchedule($admin);

        $this->postJson(
            "/api/schedules/{$scheduleId}/members",
            [
                'profile_id' => $memberProfile->id,
                'function_type' => 'sound_tech',
            ],
            $this->authHeadersFor($admin),
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['function_type']);
    }

    public function test_manager_can_delete_technical_schedule_week(): void
    {
        $manager = User::factory()->create();
        $techA = $this->createTechnician(true, true, true);
        $techB = $this->createTechnician(true, true, true);
        $techC = $this->createTechnician(true, true, true);

        $week = TechnicalSchedule::query()->create([
            'week_start_date' => now()->addWeek()->startOfWeek()->format('Y-m-d'),
            'lead_profile_id' => $techA->id,
            'sound_profile_id' => $techB->id,
            'streaming_profile_id' => $techC->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $this->deleteJson(
            "/api/technical-schedules/{$week->id}",
            [],
            $this->authHeadersFor($manager),
        )->assertOk();

        $this->assertDatabaseMissing('technical_schedules', [
            'id' => $week->id,
        ]);
    }

    public function test_generation_can_repeat_previous_week_lead_when_needed(): void
    {
        $manager = User::factory()->create();
        $techA = $this->createTechnician(true, false, false);
        $techB = $this->createTechnician(false, true, false);
        $techC = $this->createTechnician(false, false, true);

        $start = Carbon::create(2030, 3, 11, 0, 0, 0, 'UTC');

        TechnicalSchedule::query()->create([
            'week_start_date' => $start->copy()->subWeek()->format('Y-m-d'),
            'lead_profile_id' => $techA->id,
            'sound_profile_id' => $techB->id,
            'streaming_profile_id' => $techC->id,
            'created_by' => $manager->id,
            'updated_by' => $manager->id,
        ]);

        $response = $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => $start->format('Y-m-d'),
                'weeks' => 1,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )->assertOk();

        $week = $response->json('weeks.0');

        $this->assertSame($techA->id, $week['lead_profile_id']);
    }

    public function test_generation_uses_recent_history_and_returns_valid_assignment(): void
    {
        $manager = User::factory()->create();

        $techA = $this->createTechnician(false, true, true);
        $techB = $this->createTechnician(false, true, true);
        $techC = $this->createTechnician(false, true, true);
        $techD = $this->createTechnician(true, false, false);
        $techE = $this->createTechnician(false, true, false);
        $techF = $this->createTechnician(false, false, true);

        $history = [
            ['week_start_date' => '2030-02-25', 'lead' => $techD->id, 'sound' => $techA->id, 'streaming' => $techC->id],
            ['week_start_date' => '2030-03-04', 'lead' => $techD->id, 'sound' => $techA->id, 'streaming' => $techF->id],
            ['week_start_date' => '2030-03-11', 'lead' => $techD->id, 'sound' => $techB->id, 'streaming' => $techC->id],
            ['week_start_date' => '2030-03-18', 'lead' => $techD->id, 'sound' => $techB->id, 'streaming' => $techF->id],
        ];

        foreach ($history as $week) {
            TechnicalSchedule::query()->create([
                'week_start_date' => $week['week_start_date'],
                'lead_profile_id' => $week['lead'],
                'sound_profile_id' => $week['sound'],
                'streaming_profile_id' => $week['streaming'],
                'created_by' => $manager->id,
                'updated_by' => $manager->id,
            ]);
        }

        $response = $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => '2030-03-25',
                'weeks' => 1,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )->assertOk();

        $week = $response->json('weeks.0');

        $this->assertSame($techD->id, $week['lead_profile_id']);
        $this->assertContains($week['sound_profile_id'], [$techA->id, $techB->id, $techE->id]);
        $this->assertContains($week['streaming_profile_id'], [$techA->id, $techB->id, $techC->id, $techF->id]);
        $this->assertNotSame($week['lead_profile_id'], $week['sound_profile_id']);
        $this->assertNotSame($week['lead_profile_id'], $week['streaming_profile_id']);
        $this->assertNotSame($week['sound_profile_id'], $week['streaming_profile_id']);
    }

    public function test_each_lead_capable_technician_serves_as_lead_at_least_once_every_eight_weeks(): void
    {
        $manager = User::factory()->create();
        $leadA = $this->createTechnician(true, true, true);
        $leadB = $this->createTechnician(true, true, true);
        $leadC = $this->createTechnician(true, true, true);
        $leadD = $this->createTechnician(true, true, true);
        $this->createTechnician(false, true, true);
        $this->createTechnician(false, true, true);

        $startDate = '2030-03-04';

        $response = $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => $startDate,
                'weeks' => 8,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )
            ->assertOk()
            ->assertJsonPath('monthly_lead_deficit_score', 0);

        $leadAssignments = collect($response->json('weeks'))
            ->map(fn (array $week) => $week['lead_profile_id'])
            ->filter()
            ->values()
            ->all();

        $this->assertContains($leadA->id, $leadAssignments);
        $this->assertContains($leadB->id, $leadAssignments);
        $this->assertContains($leadC->id, $leadAssignments);
        $this->assertContains($leadD->id, $leadAssignments);
    }

    public function test_generation_rotates_lead_sequentially_week_by_week(): void
    {
        $manager = User::factory()->create();

        $leadA = $this->createTechnician(true, false, false);
        $leadA->update(['name' => 'Lead A']);

        $leadB = $this->createTechnician(true, false, false);
        $leadB->update(['name' => 'Lead B']);

        $leadC = $this->createTechnician(true, false, false);
        $leadC->update(['name' => 'Lead C']);

        $this->createTechnician(false, true, false);
        $this->createTechnician(false, false, true);

        $response = $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => '2030-04-01',
                'weeks' => 6,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )
            ->assertOk()
            ->assertJsonPath('lead_coverage_deficit_score', 0);

        $leadAssignments = collect($response->json('weeks'))
            ->map(fn (array $week) => $week['lead_profile_id'])
            ->values()
            ->all();

        $this->assertSame([
            $leadA->id,
            $leadB->id,
            $leadC->id,
            $leadA->id,
            $leadB->id,
            $leadC->id,
        ], $leadAssignments);
    }

    public function test_generation_with_less_weeks_than_leads_is_rejected(): void
    {
        $manager = User::factory()->create();
        $this->createTechnician(true, true, true);
        $this->createTechnician(true, true, true);
        $this->createTechnician(true, true, true);
        $this->createTechnician(false, true, true);

        $this->postJson(
            '/api/technical-schedules/generate',
            [
                'start_date' => '2030-03-18',
                'weeks' => 2,
                'simulate' => true,
            ],
            $this->authHeadersFor($manager),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['weeks']);
    }

    private function createTechnician(bool $canLead, bool $canSound, bool $canStreaming, ?string $homeGroup = null)
    {
        $user = User::factory()->create();
        $profile = $user->profile()->firstOrFail();

        $profile->update([
            'is_approved' => true,
            'is_active' => true,
            'can_be_tech_lead' => $canLead,
            'can_be_tech_sound' => $canSound,
            'can_be_tech_streaming' => $canStreaming,
            'home_group' => $homeGroup,
        ]);

        return $profile;
    }

    private function createWorshipSchedule(User $actor): string
    {
        $response = $this->postJson(
            '/api/schedules',
            [
                'schedule_date' => now()->addWeeks(2)->format('Y-m-d'),
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
}
