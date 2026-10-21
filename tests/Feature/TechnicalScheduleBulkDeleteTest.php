<?php

namespace Tests\Feature;

use App\Models\TechnicalSchedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TechnicalScheduleBulkDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_deletes_several_weeks_at_once(): void
    {
        $admin = User::factory()->create(); // First user becomes admin.
        $weeks = collect(range(0, 2))->map(fn (int $offset) => TechnicalSchedule::query()->create([
            'week_start_date' => now()->addWeeks($offset)->format('Y-m-d'),
            'schedule_type' => 'public_worship',
        ]));

        $this->postJson('/api/technical-schedules/delete-many', [
            'ids' => [$weeks[0]->id, $weeks[1]->id],
        ], $this->authHeadersFor($admin))
            ->assertOk()
            ->assertJsonPath('deleted', 2);

        $this->assertDatabaseMissing('technical_schedules', ['id' => $weeks[0]->id]);
        $this->assertDatabaseMissing('technical_schedules', ['id' => $weeks[1]->id]);
        $this->assertDatabaseHas('technical_schedules', ['id' => $weeks[2]->id]);
    }

    public function test_plain_members_cannot_bulk_delete(): void
    {
        User::factory()->create(); // Admin.
        $member = User::factory()->create();
        $week = TechnicalSchedule::query()->create([
            'week_start_date' => now()->format('Y-m-d'),
            'schedule_type' => 'public_worship',
        ]);

        $this->postJson('/api/technical-schedules/delete-many', ['ids' => [$week->id]], $this->authHeadersFor($member))
            ->assertForbidden();

        $this->assertDatabaseHas('technical_schedules', ['id' => $week->id]);
    }

    public function test_generation_skips_streaming_while_it_is_hidden(): void
    {
        $admin = User::factory()->create();

        foreach ([[true, true], [true, true], [false, true], [false, true]] as [$canLead, $canSound]) {
            User::factory()->create()->profile()->firstOrFail()->update([
                'is_approved' => true,
                'is_active' => true,
                'can_be_tech_lead' => $canLead,
                'can_be_tech_sound' => $canSound,
                'can_be_tech_streaming' => false,
            ]);
        }

        $weeks = $this->postJson('/api/technical-schedules/generate', [
            'start_date' => now()->addDay()->format('Y-m-d'),
            'weeks' => 2,
        ], $this->authHeadersFor($admin))->assertOk()->json('weeks');

        $this->assertCount(2, $weeks);
        $this->assertNull($weeks[0]['streaming_profile_id']);
        $this->assertNotNull($weeks[0]['lead_profile_id']);
    }

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
