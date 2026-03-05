<?php

namespace App\Services\TechnicalSchedule;

use App\Models\Profile;
use App\Models\TechnicalSchedule;
use RuntimeException;

class ScheduleOptimizer
{
    public function __construct(
        private readonly BacktrackingEngine $backtrackingEngine,
        private readonly FairnessCalculator $fairnessCalculator,
    ) {
    }

    /**
     * @param  list<string>  $weekDates
     * @return array{
     *   assignments_by_date: array<string, array{lead:?string,sound:?string,streaming:?string}>,
     *   fairness_score: int,
     *   lead_coverage_deficit_score: int,
     *   lead_sequence_deviation_score: int,
     *   monthly_lead_deficit_score: int,
     *   role_repetition_score: int,
     *   load_by_technician: array<string, int>,
     *   schedule_type: string,
     *   technicians: array<string, array{id:string,name:string,avatar_url:?string,home_group:?string,can_be_tech_lead:bool,can_be_tech_sound:bool,can_be_tech_streaming:bool}>
     * }
     */
    public function optimize(
        array $weekDates,
        ?int $maxFairnessGap = null,
        bool $requiresStreaming = true,
        ?string $homeGroupFilter = null,
        string $scheduleType = 'public_worship',
    ): array
    {
        if ($weekDates === []) {
            throw new RuntimeException('Nenhuma semana informada para geração.');
        }

        $requiredRoles = $requiresStreaming ? ['lead', 'sound', 'streaming'] : ['lead', 'sound'];

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
        $techniciansWithAvatarById = [];

        foreach ($technicians as $technician) {
            $techniciansById[$technician->id] = [
                'id' => $technician->id,
                'name' => $technician->name,
                'home_group' => $technician->home_group,
                'can_be_tech_lead' => (bool) $technician->can_be_tech_lead,
                'can_be_tech_sound' => (bool) $technician->can_be_tech_sound,
                'can_be_tech_streaming' => (bool) $technician->can_be_tech_streaming,
            ];

            $techniciansWithAvatarById[$technician->id] = [
                ...$techniciansById[$technician->id],
                'avatar_url' => $technician->avatar_url,
            ];
        }

        if (count($techniciansById) < count($requiredRoles)) {
            throw new RuntimeException(
                'Escala técnica impossível com regras atuais: mínimo de ' . count($requiredRoles) . ' técnicos elegíveis.',
            );
        }

        $roleAvailability = [
            'lead' => 0,
            'sound' => 0,
            'streaming' => 0,
        ];

        foreach ($techniciansById as $technician) {
            if ($technician['can_be_tech_lead']) {
                $roleAvailability['lead']++;
            }

            if ($technician['can_be_tech_sound']) {
                $roleAvailability['sound']++;
            }

            if ($technician['can_be_tech_streaming']) {
                $roleAvailability['streaming']++;
            }
        }

        foreach ($requiredRoles as $role) {
            $count = $roleAvailability[$role] ?? 0;
            if ($count === 0) {
                throw new RuntimeException("Escala técnica impossível: não há técnico elegível para {$role}.");
            }
        }

        $leadEligibleTechnicianIds = array_values(array_keys(array_filter(
            $techniciansById,
            fn (array $technician): bool => (bool) $technician['can_be_tech_lead'],
        )));

        if ($leadEligibleTechnicianIds === []) {
            throw new RuntimeException('Escala técnica impossível: não há técnico elegível para lead.');
        }

        $baselineLoadByTechnician = [];
        $baselineRoleLoadByTechnician = [];
        $baselineLastServedAtByTechnician = [];

        foreach (array_keys($techniciansById) as $technicianId) {
            $baselineLoadByTechnician[$technicianId] = 0;
            $baselineRoleLoadByTechnician[$technicianId] = [
                'lead' => 0,
                'sound' => 0,
                'streaming' => 0,
            ];
            $baselineLastServedAtByTechnician[$technicianId] = null;
        }

        $firstWeekDate = min($weekDates);
        $lastWeekDate = max($weekDates);
        $baselineLeadAssignmentsByCoverageIntervalAndTechnician = [];

        $historicalSchedules = TechnicalSchedule::query()
            ->whereDate('week_start_date', '<', $firstWeekDate)
            ->where('schedule_type', $scheduleType)
            ->orderBy('week_start_date')
            ->get([
                'week_start_date',
                'lead_profile_id',
                'sound_profile_id',
                'streaming_profile_id',
            ]);

        foreach ($historicalSchedules as $historicalSchedule) {
            $weekDate = optional($historicalSchedule->week_start_date)->format('Y-m-d');

            if (! $weekDate) {
                continue;
            }

            foreach (ConstraintValidator::ROLES as $role) {
                $column = $role . '_profile_id';
                $technicianId = $historicalSchedule->{$column};

                if (! $technicianId || ! isset($baselineLoadByTechnician[$technicianId])) {
                    continue;
                }

                $baselineLoadByTechnician[$technicianId]++;
                $baselineRoleLoadByTechnician[$technicianId][$role]++;
                $baselineLastServedAtByTechnician[$technicianId] = $weekDate;
            }
        }

        $previousBoundarySchedule = TechnicalSchedule::query()
            ->whereDate('week_start_date', '<', $firstWeekDate)
            ->where('schedule_type', $scheduleType)
            ->orderByDesc('week_start_date')
            ->first([
                'lead_profile_id',
                'sound_profile_id',
                'streaming_profile_id',
            ]);

        $nextBoundarySchedule = TechnicalSchedule::query()
            ->whereDate('week_start_date', '>', $lastWeekDate)
            ->where('schedule_type', $scheduleType)
            ->orderBy('week_start_date')
            ->first([
                'lead_profile_id',
                'sound_profile_id',
                'streaming_profile_id',
            ]);

        $solution = $this->backtrackingEngine->solve(
            $weekDates,
            $techniciansById,
            $baselineLoadByTechnician,
            $baselineRoleLoadByTechnician,
            $baselineLastServedAtByTechnician,
            $leadEligibleTechnicianIds,
            $baselineLeadAssignmentsByCoverageIntervalAndTechnician,
            $this->boundaryAssignmentFromModel($previousBoundarySchedule),
            $this->boundaryAssignmentFromModel($nextBoundarySchedule),
            $requiredRoles,
            $maxFairnessGap,
        );

        if (! $solution) {
            throw new RuntimeException('Escala técnica impossível com regras atuais.');
        }

        if (($solution['lead_coverage_deficit_score'] ?? 0) > 0) {
            throw new RuntimeException(
                'Não foi possível atribuir pelo menos 1 semana como lead para cada técnico elegível no intervalo selecionado. '
                . 'Aumente o número de semanas ou revise as permissões técnicas.',
            );
        }

        return [
            ...$solution,
            'schedule_type' => $scheduleType,
            'fairness_score' => $this->fairnessCalculator->getFairnessScore($solution['load_by_technician']),
            'technicians' => $techniciansWithAvatarById,
        ];
    }

    /**
     * @return array{lead:?string,sound:?string,streaming:?string}|null
     */
    private function boundaryAssignmentFromModel(?TechnicalSchedule $schedule): ?array
    {
        if (! $schedule) {
            return null;
        }

        $assignment = [
            'lead' => $schedule->lead_profile_id ?: null,
            'sound' => $schedule->sound_profile_id ?: null,
            'streaming' => $schedule->streaming_profile_id ?: null,
        ];

        if (! $assignment['lead'] && ! $assignment['sound'] && ! $assignment['streaming']) {
            return null;
        }

        return $assignment;
    }
}
