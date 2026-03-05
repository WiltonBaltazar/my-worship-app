<?php

namespace App\Services\TechnicalSchedule;

use Illuminate\Support\Carbon;

class BacktrackingEngine
{
    private const MAX_SEARCH_NODES = 250000;
    private const LEAD_COVERAGE_INTERVAL_WEEKS = 8;

    /**
     * @var list<string>
     */
    private array $weekDates = [];

    /**
     * @var array<string, array{id:string,name:string,can_be_tech_lead:bool,can_be_tech_sound:bool,can_be_tech_streaming:bool}>
     */
    private array $techniciansById = [];

    /**
     * @var array<int, array{lead:?string,sound:?string,streaming:?string}|null>
     */
    private array $assignmentsByWeekIndex = [];

    /**
     * @var array<int, string>
     */
    private array $requiredRoles = ConstraintValidator::ROLES;

    /**
     * @var array<int, string>
     */
    private array $coverageIntervalByWeekIndex = [];

    /**
     * @var list<string>
     */
    private array $requiredCoverageIntervals = [];

    /**
     * @var list<string>
     */
    private array $leadEligibleTechnicianIds = [];

    /**
     * @var list<string>
     */
    private array $leadRotationOrder = [];

    private int $leadRotationStartIndex = 0;

    /**
     * @var array<string, array<string, int>>
     */
    private array $leadAssignmentsByCoverageIntervalAndTechnician = [];

    /**
     * @var array{lead:?string,sound:?string,streaming:?string}|null
     */
    private ?array $previousBoundaryAssignment = null;

    /**
     * @var array{lead:?string,sound:?string,streaming:?string}|null
     */
    private ?array $nextBoundaryAssignment = null;

    /**
     * @var array<string, int>
     */
    private array $loadByTechnician = [];

    /**
     * @var array<string, array{lead:int,sound:int,streaming:int}>
     */
    private array $roleLoadByTechnician = [];

    /**
     * @var array<string, string|null>
     */
    private array $lastServedAtByTechnician = [];

    /**
     * @var array<int, string>
     */
    private array $expectedLeadByWeekIndex = [];

    /**
     * @var array{
     *   assignments_by_date: array<string, array{lead:?string,sound:?string,streaming:?string}>,
     *   fairness_score: int,
     *   lead_coverage_deficit_score: int,
     *   lead_sequence_deviation_score: int,
     *   monthly_lead_deficit_score: int,
     *   role_repetition_score: int,
     *   load_by_technician: array<string, int>
     * }|null
     */
    private ?array $bestSolution = null;

    private int $searchNodes = 0;

    public function __construct(
        private readonly ConstraintValidator $constraintValidator,
        private readonly FairnessCalculator $fairnessCalculator,
    ) {
    }

    /**
     * @param  list<string>  $weekDates
     * @param  array<string, array{id:string,name:string,can_be_tech_lead:bool,can_be_tech_sound:bool,can_be_tech_streaming:bool}>  $techniciansById
     * @param  array<string, int>  $baselineLoadByTechnician
     * @param  array<string, array{lead:int,sound:int,streaming:int}>  $baselineRoleLoadByTechnician
     * @param  array<string, string|null>  $baselineLastServedAtByTechnician
     * @param  list<string>  $leadEligibleTechnicianIds
     * @param  array<string, array<string, int>>  $baselineLeadAssignmentsByCoverageIntervalAndTechnician
     * @param  array{lead:?string,sound:?string,streaming:?string}|null  $previousBoundaryAssignment
     * @param  array{lead:?string,sound:?string,streaming:?string}|null  $nextBoundaryAssignment
     * @param  array<int, string>  $requiredRoles
     * @return array{
     *   assignments_by_date: array<string, array{lead:?string,sound:?string,streaming:?string}>,
     *   fairness_score: int,
     *   lead_coverage_deficit_score: int,
     *   lead_sequence_deviation_score: int,
     *   monthly_lead_deficit_score: int,
     *   role_repetition_score: int,
     *   load_by_technician: array<string, int>
     * }|null
     */
    public function solve(
        array $weekDates,
        array $techniciansById,
        array $baselineLoadByTechnician,
        array $baselineRoleLoadByTechnician,
        array $baselineLastServedAtByTechnician,
        array $leadEligibleTechnicianIds,
        array $baselineLeadAssignmentsByCoverageIntervalAndTechnician,
        ?array $previousBoundaryAssignment = null,
        ?array $nextBoundaryAssignment = null,
        array $requiredRoles = ConstraintValidator::ROLES,
        ?int $maxFairnessGap = null,
    ): ?array {
        $this->weekDates = array_values($weekDates);
        $this->techniciansById = $techniciansById;
        $this->assignmentsByWeekIndex = array_fill(0, count($this->weekDates), null);
        $this->coverageIntervalByWeekIndex = [];
        foreach ($this->weekDates as $index => $weekDate) {
            $this->coverageIntervalByWeekIndex[$index] = $this->coverageIntervalKeyForWeekIndex($index);
        }
        $this->requiredCoverageIntervals = array_values(array_unique($this->coverageIntervalByWeekIndex));
        $this->leadEligibleTechnicianIds = array_values($leadEligibleTechnicianIds);
        $this->previousBoundaryAssignment = $previousBoundaryAssignment;
        $this->nextBoundaryAssignment = $nextBoundaryAssignment;
        $this->requiredRoles = array_values(array_unique($requiredRoles));
        $this->leadRotationOrder = $this->leadEligibleTechnicianIds;
        $this->leadRotationStartIndex = 0;
        if (
            $this->previousBoundaryAssignment
            && ! empty($this->previousBoundaryAssignment['lead'])
            && $this->leadRotationOrder !== []
        ) {
            $previousLeadIndex = array_search($this->previousBoundaryAssignment['lead'], $this->leadRotationOrder, true);
            if ($previousLeadIndex !== false) {
                $this->leadRotationStartIndex = ((int) $previousLeadIndex + 1) % count($this->leadRotationOrder);
            }
        }
        $this->expectedLeadByWeekIndex = [];
        foreach (array_keys($this->weekDates) as $index) {
            $this->expectedLeadByWeekIndex[$index] = $this->expectedLeadForWeekIndex($index);
        }
        $this->loadByTechnician = $baselineLoadByTechnician;
        $this->roleLoadByTechnician = $baselineRoleLoadByTechnician;
        $this->lastServedAtByTechnician = $baselineLastServedAtByTechnician;
        $this->leadAssignmentsByCoverageIntervalAndTechnician = [];
        foreach ($this->requiredCoverageIntervals as $intervalKey) {
            $this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey] = [];

            foreach ($this->leadEligibleTechnicianIds as $technicianId) {
                $this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$technicianId] = (int) (
                    $baselineLeadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$technicianId] ?? 0
                );
            }
        }
        $this->bestSolution = null;
        $this->searchNodes = 0;

        $this->backtrack(0, $maxFairnessGap);

        return $this->bestSolution;
    }

    private function backtrack(int $weekIndex, ?int $maxFairnessGap): void
    {
        if ($this->searchNodes >= self::MAX_SEARCH_NODES) {
            return;
        }

        $this->searchNodes++;

        if ($weekIndex >= count($this->weekDates)) {
            $this->evaluateCurrentSolution();
            return;
        }

        $weekDate = $this->weekDates[$weekIndex];
        foreach ($this->generateCombinationsForWeek($weekIndex, $weekDate) as $combination) {
            if (! $this->constraintValidator->isValidCombination(
                $weekIndex,
                $combination,
                $this->assignmentsByWeekIndex,
                $this->techniciansById,
                $this->previousBoundaryAssignment,
                $this->nextBoundaryAssignment,
                $this->requiredRoles,
            )) {
                continue;
            }

            $snapshot = $this->applyAssignment($weekIndex, $weekDate, $combination);

            if (
                $maxFairnessGap !== null
                && $this->fairnessCalculator->getFairnessScore($this->loadByTechnician) > $maxFairnessGap
            ) {
                $this->undoAssignment($weekIndex, $combination, $snapshot);
                continue;
            }

            if (! $this->passesForwardChecking($weekIndex + 1, $maxFairnessGap)) {
                $this->undoAssignment($weekIndex, $combination, $snapshot);
                continue;
            }

            $this->backtrack($weekIndex + 1, $maxFairnessGap);
            $this->undoAssignment($weekIndex, $combination, $snapshot);
        }
    }

    /**
     * @param  array{lead:?string,sound:?string,streaming:?string}  $combination
     * @return array<string, string|null>
     */
    private function applyAssignment(int $weekIndex, string $weekDate, array $combination): array
    {
        $this->assignmentsByWeekIndex[$weekIndex] = $combination;
        $previousLastServed = [];

        foreach ($this->requiredRoles as $role) {
            $technicianId = $combination[$role];
            $previousLastServed[$technicianId] = $this->lastServedAtByTechnician[$technicianId] ?? null;
            $this->loadByTechnician[$technicianId]++;
            $this->roleLoadByTechnician[$technicianId][$role]++;
            $this->lastServedAtByTechnician[$technicianId] = $weekDate;
        }

        $leadTechnicianId = $combination['lead'];
        $intervalKey = $this->coverageIntervalByWeekIndex[$weekIndex];
        if (isset($this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$leadTechnicianId])) {
            $this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$leadTechnicianId]++;
        }

        return $previousLastServed;
    }

    /**
     * @param  array{lead:?string,sound:?string,streaming:?string}  $combination
     * @param  array<string, string|null>  $previousLastServed
     */
    private function undoAssignment(int $weekIndex, array $combination, array $previousLastServed): void
    {
        $this->assignmentsByWeekIndex[$weekIndex] = null;

        foreach ($this->requiredRoles as $role) {
            $technicianId = $combination[$role];
            $this->loadByTechnician[$technicianId]--;
            $this->roleLoadByTechnician[$technicianId][$role]--;
            $this->lastServedAtByTechnician[$technicianId] = $previousLastServed[$technicianId] ?? null;
        }

        $leadTechnicianId = $combination['lead'];
        $intervalKey = $this->coverageIntervalByWeekIndex[$weekIndex];
        if (isset($this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$leadTechnicianId])) {
            $this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$leadTechnicianId]--;
        }
    }

    private function evaluateCurrentSolution(): void
    {
        $assignmentsByDate = [];

        foreach ($this->weekDates as $index => $weekDate) {
            $assignment = $this->assignmentsByWeekIndex[$index] ?? null;

            if (! $assignment) {
                return;
            }

            $assignmentsByDate[$weekDate] = $assignment;
        }

        $leadCoverageDeficitScore = $this->leadCoverageDeficitScore();
        $leadSequenceDeviationScore = $this->leadSequenceDeviationScore();
        $fairnessScore = $this->fairnessCalculator->getFairnessScore($this->loadByTechnician);
        $repetitionScore = $this->fairnessCalculator->getRoleRepetitionScore($this->roleLoadByTechnician);

        if (
            $this->bestSolution === null
            || $leadCoverageDeficitScore < $this->bestSolution['lead_coverage_deficit_score']
            || (
                $leadCoverageDeficitScore === $this->bestSolution['lead_coverage_deficit_score']
                && $leadSequenceDeviationScore < $this->bestSolution['lead_sequence_deviation_score']
            )
            || (
                $leadCoverageDeficitScore === $this->bestSolution['lead_coverage_deficit_score']
                && $leadSequenceDeviationScore === $this->bestSolution['lead_sequence_deviation_score']
                && $fairnessScore < $this->bestSolution['fairness_score']
            )
            || (
                $leadCoverageDeficitScore === $this->bestSolution['lead_coverage_deficit_score']
                && $leadSequenceDeviationScore === $this->bestSolution['lead_sequence_deviation_score']
                && $fairnessScore === $this->bestSolution['fairness_score']
                && $repetitionScore < $this->bestSolution['role_repetition_score']
            )
        ) {
            $this->bestSolution = [
                'assignments_by_date' => $assignmentsByDate,
                'fairness_score' => $fairnessScore,
                'lead_coverage_deficit_score' => $leadCoverageDeficitScore,
                'lead_sequence_deviation_score' => $leadSequenceDeviationScore,
                // Backward-compatible alias for existing API payloads.
                'monthly_lead_deficit_score' => $leadCoverageDeficitScore,
                'role_repetition_score' => $repetitionScore,
                'load_by_technician' => $this->loadByTechnician,
            ];
        }
    }

    /**
     * @return list<array{lead:?string,sound:?string,streaming:?string}>
     */
    private function generateCombinationsForWeek(int $weekIndex, string $weekDate): array
    {
        $leadCandidates = $this->rankTechniciansForRole('lead', $weekIndex, $weekDate);
        $soundCandidates = $this->rankTechniciansForRole('sound', $weekIndex, $weekDate);
        $requiresStreaming = in_array('streaming', $this->requiredRoles, true);
        $streamingCandidates = $requiresStreaming
            ? $this->rankTechniciansForRole('streaming', $weekIndex, $weekDate)
            : [];

        $combinations = [];

        foreach ($leadCandidates as $lead) {
            foreach ($soundCandidates as $sound) {
                if ($sound === $lead) {
                    continue;
                }

                if (! $requiresStreaming) {
                    $combinations[] = [
                        'lead' => $lead,
                        'sound' => $sound,
                        'streaming' => null,
                    ];

                    continue;
                }

                foreach ($streamingCandidates as $streaming) {
                    if ($streaming === $lead || $streaming === $sound) {
                        continue;
                    }

                    $combinations[] = [
                        'lead' => $lead,
                        'sound' => $sound,
                        'streaming' => $streaming,
                    ];
                }
            }
        }

        return $combinations;
    }

    /**
     * @return list<string>
     */
    private function rankTechniciansForRole(string $role, int $weekIndex, string $weekDate, array $blockedTechnicians = []): array
    {
        $intervalKey = $this->coverageIntervalByWeekIndex[$weekIndex];
        $expectedLead = $this->expectedLeadByWeekIndex[$weekIndex] ?? null;

        $eligible = array_values(array_filter(
            array_keys($this->techniciansById),
            fn (string $technicianId): bool => $this->constraintValidator->isTechnicianEligibleForRole(
                $technicianId,
                $role,
                $this->techniciansById,
            ) && ! in_array($technicianId, $blockedTechnicians, true),
        ));

        usort($eligible, function (string $left, string $right) use ($role, $weekDate, $intervalKey, $expectedLead): int {
            if ($role === 'lead') {
                $leftIsExpected = $expectedLead !== null && $left === $expectedLead;
                $rightIsExpected = $expectedLead !== null && $right === $expectedLead;

                if ($leftIsExpected !== $rightIsExpected) {
                    return $leftIsExpected ? -1 : 1;
                }

                $leftHasCoverage = (($this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$left] ?? 0) >= 1);
                $rightHasCoverage = (($this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$right] ?? 0) >= 1);

                if ($leftHasCoverage !== $rightHasCoverage) {
                    return $leftHasCoverage ? 1 : -1;
                }
            }

            $leftLoad = $this->loadByTechnician[$left] ?? 0;
            $rightLoad = $this->loadByTechnician[$right] ?? 0;

            if ($leftLoad !== $rightLoad) {
                return $leftLoad <=> $rightLoad;
            }

            $leftRoleLoad = $this->roleLoadByTechnician[$left][$role] ?? 0;
            $rightRoleLoad = $this->roleLoadByTechnician[$right][$role] ?? 0;

            if ($leftRoleLoad !== $rightRoleLoad) {
                return $leftRoleLoad <=> $rightRoleLoad;
            }

            $leftIdle = $this->idleDays($left, $weekDate);
            $rightIdle = $this->idleDays($right, $weekDate);

            if ($leftIdle !== $rightIdle) {
                return $rightIdle <=> $leftIdle;
            }

            return strcmp(
                $this->techniciansById[$left]['name'],
                $this->techniciansById[$right]['name'],
            );
        });

        return $eligible;
    }

    private function idleDays(string $technicianId, string $weekDate): int
    {
        $lastServedAt = $this->lastServedAtByTechnician[$technicianId] ?? null;

        if (! $lastServedAt) {
            return 9999;
        }

        return Carbon::parse($lastServedAt)->diffInDays(Carbon::parse($weekDate));
    }

    private function passesForwardChecking(int $weekIndex, ?int $maxFairnessGap): bool
    {
        if (
            $this->bestSolution !== null
            && $this->minimumLeadCoverageDeficitFrom($weekIndex) > $this->bestSolution['lead_coverage_deficit_score']
        ) {
            return false;
        }

        if ($weekIndex >= count($this->weekDates)) {
            return true;
        }

        if (
            $maxFairnessGap !== null
            && $this->fairnessCalculator->getFairnessScore($this->loadByTechnician) > $maxFairnessGap
        ) {
            return false;
        }

        $assignment = $this->assignmentsByWeekIndex[$weekIndex] ?? null;

        if ($assignment) {
            return $this->constraintValidator->isValidCombination(
                $weekIndex,
                $assignment,
                $this->assignmentsByWeekIndex,
                $this->techniciansById,
                $this->previousBoundaryAssignment,
                $this->nextBoundaryAssignment,
                $this->requiredRoles,
            );
        }

        $weekDate = $this->weekDates[$weekIndex];

        foreach ($this->generateCombinationsForWeek($weekIndex, $weekDate) as $combination) {
            if ($this->constraintValidator->isValidCombination(
                $weekIndex,
                $combination,
                $this->assignmentsByWeekIndex,
                $this->techniciansById,
                $this->previousBoundaryAssignment,
                $this->nextBoundaryAssignment,
                $this->requiredRoles,
            )) {
                return true;
            }
        }

        return false;
    }

    private function leadCoverageDeficitScore(): int
    {
        $deficit = 0;

        foreach ($this->requiredCoverageIntervals as $intervalKey) {
            foreach ($this->leadEligibleTechnicianIds as $technicianId) {
                if (($this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$technicianId] ?? 0) < 1) {
                    $deficit++;
                }
            }
        }

        return $deficit;
    }

    private function minimumLeadCoverageDeficitFrom(int $weekIndex): int
    {
        $remainingOpenSlotsByInterval = [];

        for ($index = $weekIndex; $index < count($this->weekDates); $index++) {
            if ($this->assignmentsByWeekIndex[$index] !== null) {
                continue;
            }

            $intervalKey = $this->coverageIntervalByWeekIndex[$index];
            $remainingOpenSlotsByInterval[$intervalKey] = ($remainingOpenSlotsByInterval[$intervalKey] ?? 0) + 1;
        }

        $minimumDeficit = 0;

        foreach ($this->requiredCoverageIntervals as $intervalKey) {
            $uncoveredLeads = 0;

            foreach ($this->leadEligibleTechnicianIds as $technicianId) {
                if (($this->leadAssignmentsByCoverageIntervalAndTechnician[$intervalKey][$technicianId] ?? 0) < 1) {
                    $uncoveredLeads++;
                }
            }

            $remainingSlots = $remainingOpenSlotsByInterval[$intervalKey] ?? 0;
            $minimumDeficit += max(0, $uncoveredLeads - $remainingSlots);
        }

        return $minimumDeficit;
    }

    private function leadSequenceDeviationScore(): int
    {
        $deviation = 0;

        foreach ($this->assignmentsByWeekIndex as $weekIndex => $assignment) {
            if (! $assignment) {
                continue;
            }

            if (($assignment['lead'] ?? null) !== ($this->expectedLeadByWeekIndex[$weekIndex] ?? null)) {
                $deviation++;
            }
        }

        return $deviation;
    }

    private function expectedLeadForWeekIndex(int $weekIndex): string
    {
        if ($this->leadRotationOrder === []) {
            return '';
        }

        $position = ($this->leadRotationStartIndex + $weekIndex) % count($this->leadRotationOrder);

        return $this->leadRotationOrder[$position];
    }

    private function coverageIntervalKeyForWeekIndex(int $weekIndex): string
    {
        return 'interval_' . intdiv($weekIndex, self::LEAD_COVERAGE_INTERVAL_WEEKS);
    }
}
