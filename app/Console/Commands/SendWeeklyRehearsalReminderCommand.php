<?php

namespace App\Console\Commands;

use App\Models\AppNotification;
use App\Models\Schedule;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class SendWeeklyRehearsalReminderCommand extends Command
{
    protected $signature = 'notifications:weekly-rehearsal-reminder';

    protected $description = 'Send Tuesday reminders for members scheduled this week to rehearse repertoire songs';

    public function handle(): int
    {
        $today = CarbonImmutable::today();
        $endOfWeek = $today->endOfWeek();

        $schedules = Schedule::query()
            ->whereIn('status', ['published', 'confirmed'])
            ->where('schedule_type', 'worship')
            ->whereDate('schedule_date', '>=', $today->toDateString())
            ->whereDate('schedule_date', '<=', $endOfWeek->toDateString())
            ->with([
                'members.profile:id,user_id',
                'songs' => fn ($query) => $query
                    ->orderBy('order_position')
                    ->with('song:id,title'),
            ])
            ->get();

        $createdCount = 0;

        foreach ($schedules as $schedule) {
            $songTitles = $schedule->songs
                ->map(fn ($scheduleSong) => $scheduleSong->song?->title)
                ->filter(fn ($title) => is_string($title) && $title !== '')
                ->values();

            $message = $this->buildMessage(
                scheduleDate: optional($schedule->schedule_date)->format('d/m/Y'),
                songTitles: $songTitles,
            );

            foreach ($schedule->members as $member) {
                $userId = $member->profile?->user_id;

                if (! is_string($userId) || $userId === '') {
                    continue;
                }

                $alreadySentToday = AppNotification::query()
                    ->where('user_id', $userId)
                    ->where('schedule_id', $schedule->id)
                    ->where('type', 'schedule')
                    ->where('title', 'Lembrete de ensaio da semana')
                    ->whereDate('created_at', $today->toDateString())
                    ->exists();

                if ($alreadySentToday) {
                    continue;
                }

                AppNotification::query()->create([
                    'user_id' => $userId,
                    'schedule_id' => $schedule->id,
                    'title' => 'Lembrete de ensaio da semana',
                    'message' => $message,
                    'type' => 'schedule',
                    'created_at' => now(),
                ]);

                $createdCount++;
            }
        }

        $this->info("Weekly rehearsal reminders created: {$createdCount}");

        return self::SUCCESS;
    }

    /**
     * @param Collection<int, string> $songTitles
     */
    private function buildMessage(?string $scheduleDate, Collection $songTitles): string
    {
        $dateLabel = $scheduleDate ? " da escala de {$scheduleDate}" : '';

        if ($songTitles->isEmpty()) {
            return "Lembrete{$dateLabel}: ensaie as músicas do repertório desta semana.";
        }

        $formattedTitles = $songTitles
            ->take(5)
            ->implode(', ');

        if ($songTitles->count() > 5) {
            $formattedTitles .= '...';
        }

        return "Lembrete{$dateLabel}: ensaie as músicas do repertório ({$formattedTitles}).";
    }
}
