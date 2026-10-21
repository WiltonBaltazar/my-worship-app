<?php

namespace App\Services\TechnicalSchedule;

use App\Models\Profile;
use App\Models\Schedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use RuntimeException;

class ScheduleOptimizer
{
    /**
     * @param  list<string>  $weekDates
     * @return array{
     *   assignments_by_date: array<string, array{lead:?string,sound:?string,streaming:?string}>,
     *   schedule_type: string,
     *   technicians: array<string, array{id:string,name:string,avatar_url:?string,home_group:?string,can_be_tech_lead:bool,can_be_tech_sound:bool,can_be_tech_streaming:bool}>
     * }
     */
    public function optimize(
        array $weekDates,
        bool $requiresStreaming = true,
        ?string $homeGroupFilter = null,
        string $scheduleType = 'public_worship',
    ): array {
        if ($weekDates === []) {
            throw new RuntimeException('Nenhuma semana informada para geração.');
        }

        $techniciansQuery = Profile::query()
            ->with(['user.roles:user_id,role', 'unavailableDates', 'unavailablePeriods'])
            ->where('is_active', true)
            ->where('is_approved', true)
            ->whereNull('paused_at')
            ->where(function ($query): void {
                $query
                    ->where('can_be_tech_lead', true)
                    ->orWhere('can_be_tech_sound', true)
                    ->orWhere('can_be_tech_streaming', true);
            })
            ->orderBy('name');

        if ($homeGroupFilter !== null) {
            $techniciansQuery->where('home_group', $homeGroupFilter);
        }

        $technicians = $techniciansQuery
            ->get()
            ->reject(
                fn (Profile $profile): bool => (bool) $profile->user?->roles?->contains('role', 'admin'),
            )
            ->values();

        $techniciansById = [];

        foreach ($technicians as $technician) {
            $techniciansById[$technician->id] = [
                'id' => $technician->id,
                'name' => $technician->name,
                'avatar_url' => $technician->avatar_url,
                'home_group' => $technician->home_group,
                'can_be_tech_lead' => (bool) $technician->can_be_tech_lead,
                'can_be_tech_sound' => (bool) $technician->can_be_tech_sound,
                'can_be_tech_streaming' => (bool) $technician->can_be_tech_streaming,
            ];
        }

        $leadIds = array_values(array_keys(array_filter(
            $techniciansById,
            fn (array $t): bool => $t['can_be_tech_lead'],
        )));

        $soundIds = array_values(array_keys(array_filter(
            $techniciansById,
            fn (array $t): bool => $t['can_be_tech_sound'],
        )));

        $streamingIds = array_values(array_keys(array_filter(
            $techniciansById,
            fn (array $t): bool => $t['can_be_tech_streaming'],
        )));

        if ($leadIds === []) {
            throw new RuntimeException('Escala técnica impossível: não há técnico elegível para lead.');
        }

        if ($soundIds === []) {
            throw new RuntimeException('Escala técnica impossível: não há técnico elegível para som.');
        }

        if ($requiresStreaming && $streamingIds === []) {
            throw new RuntimeException('Escala técnica impossível: não há técnico elegível para streaming.');
        }

        $leadIndex = 0;
        $soundIndex = 0;
        $streamingIndex = 0;

        $assignmentsByDate = [];
        $serviceDatesByWeek = $this->serviceDatesByWeek($weekDates, $scheduleType);

        foreach ($weekDates as $weekDate) {
            $unavailable = $this->unavailableTechnicianIds($technicians, $serviceDatesByWeek[$weekDate]);
            $assigned = [];

            $lead = $this->pickNext($leadIds, $leadIndex, $assigned, $unavailable);
            $assigned[] = $lead;

            $sound = $this->pickNext($soundIds, $soundIndex, $assigned, $unavailable);
            $assigned[] = $sound;

            $streaming = null;
            if ($requiresStreaming) {
                $streaming = $this->pickNext($streamingIds, $streamingIndex, $assigned, $unavailable);
            }

            $assignmentsByDate[$weekDate] = [
                'lead' => $lead,
                'sound' => $sound,
                'streaming' => $streaming,
            ];
        }

        return [
            'assignments_by_date' => $assignmentsByDate,
            'schedule_type' => $scheduleType,
            'technicians' => $techniciansById,
        ];
    }

    /**
     * The dates each rota week actually serves: services of the matching ministry
     * inside the week, or the week's own date when none are scheduled yet.
     *
     * @param  list<string>  $weekDates
     * @return array<string, list<string>>
     */
    private function serviceDatesByWeek(array $weekDates, string $scheduleType): array
    {
        $ministry = $scheduleType === 'ghj' ? 'ghj' : 'dms';
        $first = Carbon::parse(min($weekDates));
        $last = Carbon::parse(max($weekDates))->addDays(6);

        $scheduleDates = Schedule::query()
            ->where('ministry', $ministry)
            ->where('schedule_type', 'worship')
            ->whereDate('schedule_date', '>=', $first->format('Y-m-d'))
            ->whereDate('schedule_date', '<=', $last->format('Y-m-d'))
            ->get(['schedule_date'])
            ->map(fn (Schedule $schedule): string => $schedule->schedule_date->format('Y-m-d'))
            ->unique()
            ->values();

        $datesByWeek = [];

        foreach ($weekDates as $weekDate) {
            $weekEnd = Carbon::parse($weekDate)->addDays(6)->format('Y-m-d');
            $dates = $scheduleDates
                ->filter(fn (string $date): bool => $date >= $weekDate && $date <= $weekEnd)
                ->values()
                ->all();

            $datesByWeek[$weekDate] = $dates !== [] ? $dates : [$weekDate];
        }

        return $datesByWeek;
    }

    /**
     * Technicians who marked any of the given dates unavailable (single date or period).
     *
     * @param  Collection<int, Profile>  $technicians
     * @param  list<string>  $dates
     * @return list<string>
     */
    private function unavailableTechnicianIds(Collection $technicians, array $dates): array
    {
        return $technicians
            ->filter(function (Profile $technician) use ($dates): bool {
                $singleDates = $technician->unavailableDates
                    ->map(fn ($record): ?string => $record->unavailable_date?->format('Y-m-d'));

                foreach ($dates as $date) {
                    if ($singleDates->contains($date)) {
                        return true;
                    }

                    foreach ($technician->unavailablePeriods as $period) {
                        if ($period->start_date->format('Y-m-d') <= $date && $date <= $period->end_date->format('Y-m-d')) {
                            return true;
                        }
                    }
                }

                return false;
            })
            ->pluck('id')
            ->values()
            ->all();
    }

    /**
     * Next technician in rotation who is free that week. Someone already holding another
     * role is reused only when nobody else is free; an absent technician never is, so the
     * role is left empty for a manager to fill instead.
     *
     * @param  list<string>  $ids
     * @param  list<string>  $excluded
     * @param  list<string>  $unavailable
     */
    private function pickNext(array $ids, int &$index, array $excluded, array $unavailable = []): ?string
    {
        $count = count($ids);

        for ($i = 0; $i < $count; $i++) {
            $candidate = $ids[($index + $i) % $count];

            if (! in_array($candidate, $excluded, true) && ! in_array($candidate, $unavailable, true)) {
                $index += $i + 1;

                return $candidate;
            }
        }

        // Fallback: too few technicians, so allow doubling up on roles but never absences.
        for ($i = 0; $i < $count; $i++) {
            $candidate = $ids[($index + $i) % $count];

            if (! in_array($candidate, $unavailable, true)) {
                $index += $i + 1;

                return $candidate;
            }
        }

        return null;
    }
}
