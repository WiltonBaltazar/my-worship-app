<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Schedule;
use App\Models\ScheduleMember;
use App\Models\ScheduleSong;
use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class WeeklyRehearsalReminderCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_command_sends_reminders_only_for_schedules_from_tuesday_to_end_of_week(): void
    {
        Carbon::setTestNow('2026-03-10 09:00:00'); // Tuesday

        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $currentWeekSchedule = Schedule::query()->create([
            'schedule_date' => '2026-03-13',
            'status' => 'published',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        $pastSchedule = Schedule::query()->create([
            'schedule_date' => '2026-03-09',
            'status' => 'published',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        $nextWeekSchedule = Schedule::query()->create([
            'schedule_date' => '2026-03-17',
            'status' => 'published',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        foreach ([$currentWeekSchedule, $pastSchedule, $nextWeekSchedule] as $schedule) {
            ScheduleMember::query()->create([
                'schedule_id' => $schedule->id,
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
                'confirmed' => true,
            ]);
        }

        $songA = Song::query()->create(['title' => 'A Alegria Está no Coração']);
        $songB = Song::query()->create(['title' => 'A Deus Toda Glória']);

        ScheduleSong::query()->create([
            'schedule_id' => $currentWeekSchedule->id,
            'song_id' => $songA->id,
            'order_position' => 0,
        ]);

        ScheduleSong::query()->create([
            'schedule_id' => $currentWeekSchedule->id,
            'song_id' => $songB->id,
            'order_position' => 1,
        ]);

        $this->artisan('notifications:weekly-rehearsal-reminder')
            ->assertSuccessful();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $currentWeekSchedule->id,
            'title' => 'Lembrete de ensaio da semana',
            'type' => 'schedule',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $pastSchedule->id,
            'title' => 'Lembrete de ensaio da semana',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $nextWeekSchedule->id,
            'title' => 'Lembrete de ensaio da semana',
        ]);

        $notification = AppNotification::query()
            ->where('user_id', $member->id)
            ->where('schedule_id', $currentWeekSchedule->id)
            ->where('title', 'Lembrete de ensaio da semana')
            ->firstOrFail();

        $this->assertStringContainsString('A Alegria Está no Coração', $notification->message);
        $this->assertStringContainsString('A Deus Toda Glória', $notification->message);
    }

    public function test_command_does_not_duplicate_reminder_for_same_schedule_on_same_day(): void
    {
        Carbon::setTestNow('2026-03-10 09:00:00'); // Tuesday

        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $schedule = Schedule::query()->create([
            'schedule_date' => '2026-03-14',
            'status' => 'confirmed',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        ScheduleMember::query()->create([
            'schedule_id' => $schedule->id,
            'profile_id' => $memberProfile->id,
            'function_type' => 'lead_vocal',
            'function_detail' => 'Voz Principal (Dirigente)',
            'confirmed' => true,
        ]);

        $this->artisan('notifications:weekly-rehearsal-reminder')
            ->assertSuccessful();

        $this->artisan('notifications:weekly-rehearsal-reminder')
            ->assertSuccessful();

        $count = AppNotification::query()
            ->where('user_id', $member->id)
            ->where('schedule_id', $schedule->id)
            ->where('title', 'Lembrete de ensaio da semana')
            ->count();

        $this->assertSame(1, $count);
    }
}
