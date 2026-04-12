<?php

namespace App\Services\TechnicalSchedule;

use App\Models\Profile;
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
            ->with('user.roles:user_id,role')
            ->where('is_active', true)
            ->where('is_approved', true)
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

        foreach ($weekDates as $weekDate) {
            $assigned = [];

            $lead = $this->pickNext($leadIds, $leadIndex, $assigned);
            $assigned[] = $lead;

            $sound = $this->pickNext($soundIds, $soundIndex, $assigned);
            $assigned[] = $sound;

            $streaming = null;
            if ($requiresStreaming) {
                $streaming = $this->pickNext($streamingIds, $streamingIndex, $assigned);
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
     * @param  list<string>  $ids
     * @param  list<string>  $excluded
     */
    private function pickNext(array $ids, int &$index, array $excluded): string
    {
        $count = count($ids);

        for ($i = 0; $i < $count; $i++) {
            $candidate = $ids[$index % $count];
            $index++;

            if (! in_array($candidate, $excluded, true)) {
                return $candidate;
            }
        }

        // Fallback: all candidates excluded (too few technicians), just rotate
        $candidate = $ids[$index % $count];
        $index++;

        return $candidate;
    }
}
