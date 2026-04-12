<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Schedule;
use App\Models\ScheduleMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class WeeklyDutyReminderCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_command_sends_monday_reminders_for_schedules_from_today_to_end_of_week(): void
    {
        Carbon::setTestNow('2026-03-09 09:00:00'); // Monday

        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $todaySchedule = Schedule::query()->create([
            'schedule_date' => '2026-03-09',
            'status' => 'published',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        $thisWeekSchedule = Schedule::query()->create([
            'schedule_date' => '2026-03-13',
            'status' => 'confirmed',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        $pastSchedule = Schedule::query()->create([
            'schedule_date' => '2026-03-08',
            'status' => 'published',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        $nextWeekSchedule = Schedule::query()->create([
            'schedule_date' => '2026-03-16',
            'status' => 'published',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        foreach ([$todaySchedule, $thisWeekSchedule, $pastSchedule, $nextWeekSchedule] as $schedule) {
            ScheduleMember::query()->create([
                'schedule_id' => $schedule->id,
                'profile_id' => $memberProfile->id,
                'function_type' => 'instrumentalist',
                'function_detail' => 'Guitarra',
                'confirmed' => true,
            ]);
        }

        $this->artisan('notifications:weekly-duty-reminder')
            ->assertSuccessful();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $todaySchedule->id,
            'title' => 'Lembrete da sua escala',
            'type' => 'schedule',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $thisWeekSchedule->id,
            'title' => 'Lembrete da sua escala',
            'type' => 'schedule',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $pastSchedule->id,
            'title' => 'Lembrete da sua escala',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $member->id,
            'schedule_id' => $nextWeekSchedule->id,
            'title' => 'Lembrete da sua escala',
        ]);

        $notification = AppNotification::query()
            ->where('user_id', $member->id)
            ->where('schedule_id', $todaySchedule->id)
            ->where('title', 'Lembrete da sua escala')
            ->firstOrFail();

        $this->assertStringContainsString('Guitarra', $notification->message);
        $this->assertStringContainsString('09/03/2026', $notification->message);
    }

    public function test_command_does_not_duplicate_reminder_for_same_schedule_on_same_day(): void
    {
        Carbon::setTestNow('2026-03-11 09:00:00'); // Wednesday

        $admin = User::factory()->create();
        $member = User::factory()->create();
        $memberProfile = $member->profile()->firstOrFail();

        $schedule = Schedule::query()->create([
            'schedule_date' => '2026-03-14',
            'status' => 'published',
            'schedule_type' => 'worship',
            'created_by' => $admin->id,
        ]);

        ScheduleMember::query()->create([
            'schedule_id' => $schedule->id,
            'profile_id' => $memberProfile->id,
            'function_type' => 'lead_vocal',
            'function_detail' => null,
            'confirmed' => true,
        ]);

        $this->artisan('notifications:weekly-duty-reminder')
            ->assertSuccessful();

        $this->artisan('notifications:weekly-duty-reminder')
            ->assertSuccessful();

        $count = AppNotification::query()
            ->where('user_id', $member->id)
            ->where('schedule_id', $schedule->id)
            ->where('title', 'Lembrete da sua escala')
            ->whereDate('created_at', '2026-03-11')
            ->count();

        $this->assertSame(1, $count);
    }
}
