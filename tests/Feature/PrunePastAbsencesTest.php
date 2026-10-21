<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrunePastAbsencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_absences_that_are_over_are_deleted(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-21 12:00', 'Africa/Maputo'));

        $profile = User::factory()->create()->profile()->firstOrFail();

        $profile->unavailableDates()->createMany([
            ['unavailable_date' => '2026-10-20'], // yesterday: removed
            ['unavailable_date' => '2026-10-21'], // today: kept
            ['unavailable_date' => '2026-10-30'], // future: kept
        ]);
        $profile->unavailablePeriods()->createMany([
            ['start_date' => '2026-10-01', 'end_date' => '2026-10-20'], // ended yesterday: removed
            ['start_date' => '2026-10-15', 'end_date' => '2026-10-25'], // still running: kept
        ]);

        $this->artisan('absences:prune')->assertSuccessful();

        $this->assertEqualsCanonicalizing(
            ['2026-10-21', '2026-10-30'],
            $profile->unavailableDates()->get()->map(fn ($date) => $date->unavailable_date->format('Y-m-d'))->all(),
        );
        $this->assertSame(
            ['2026-10-25'],
            $profile->unavailablePeriods()->get()->map(fn ($period) => $period->end_date->format('Y-m-d'))->all(),
        );
    }

    public function test_prune_is_scheduled_daily(): void
    {
        $this->artisan('schedule:list')->expectsOutputToContain('absences:prune');
    }
}
