<?php

namespace App\Console\Commands;

use App\Models\AppNotification;
use App\Models\Schedule;
use App\Models\ScheduleMember;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendWeeklyDutyReminderCommand extends Command
{
    private const REMINDER_TITLE = 'Lembrete da sua escala';

    protected $signature = 'notifications:weekly-duty-reminder';

    protected $description = 'Send Monday and Wednesday reminders for members scheduled in the current week';

    public function handle(): int
    {
        $today = CarbonImmutable::today();
        $endOfWeek = $today->endOfWeek();

        $schedules = Schedule::query()
            ->whereIn('status', ['published', 'confirmed'])
            ->whereDate('schedule_date', '>=', $today->toDateString())
            ->whereDate('schedule_date', '<=', $endOfWeek->toDateString())
            ->with(['members.profile:id,user_id'])
            ->orderBy('schedule_date')
            ->get();

        $createdCount = 0;

        foreach ($schedules as $schedule) {
            $dateLabel = optional($schedule->schedule_date)->format('d/m/Y');
            $timeLabel = is_string($schedule->start_time) && $schedule->start_time !== ''
                ? substr($schedule->start_time, 0, 5)
                : null;

            foreach ($schedule->members as $member) {
                $userId = $member->profile?->user_id;

                if (! is_string($userId) || $userId === '') {
                    continue;
                }

                $alreadySentToday = AppNotification::query()
                    ->where('user_id', $userId)
                    ->where('schedule_id', $schedule->id)
                    ->where('type', 'schedule')
                    ->where('title', self::REMINDER_TITLE)
                    ->whereDate('created_at', $today->toDateString())
                    ->exists();

                if ($alreadySentToday) {
                    continue;
                }

                AppNotification::query()->create([
                    'user_id' => $userId,
                    'schedule_id' => $schedule->id,
                    'title' => self::REMINDER_TITLE,
                    'message' => $this->buildMessage(
                        scheduleDate: $dateLabel,
                        scheduleTime: $timeLabel,
                        role: $this->resolveRoleLabel($member),
                    ),
                    'type' => 'schedule',
                    'created_at' => now(),
                ]);

                $createdCount++;
            }
        }

        $this->info("Weekly duty reminders created: {$createdCount}");

        return self::SUCCESS;
    }

    private function resolveRoleLabel(ScheduleMember $member): string
    {
        if (is_string($member->function_detail) && trim($member->function_detail) !== '') {
            return trim($member->function_detail);
        }

        return match ($member->function_type) {
            'lead_vocal' => 'Vocal Principal',
            'backing_vocal' => 'Backing Vocal',
            'sound_tech' => 'Técnico de Som',
            default => 'Instrumentista',
        };
    }

    private function buildMessage(?string $scheduleDate, ?string $scheduleTime, string $role): string
    {
        $datePart = $scheduleDate ? " para {$scheduleDate}" : '';
        $timePart = $scheduleTime ? " às {$scheduleTime}" : '';

        return "Lembrete da semana: você está escalado{$datePart}{$timePart} como {$role}.";
    }
}
