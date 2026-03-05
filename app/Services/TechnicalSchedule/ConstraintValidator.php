<?php

namespace App\Services\TechnicalSchedule;

class ConstraintValidator
{
    /**
     * @var array<int, string>
     */
    public const ROLES = ['lead', 'sound', 'streaming'];

    /**
     * @return array<int, string>
     */
    public function requiredRoles(bool $requiresStreaming = true): array
    {
        return $requiresStreaming ? self::ROLES : ['lead', 'sound'];
    }

    /**
     * @param  array{lead:?string,sound:?string,streaming:?string}  $combination
     * @param  array<int, array{lead:?string,sound:?string,streaming:?string}|null>  $assignmentsByWeekIndex
     * @param  array<string, array{id:string,name:string,can_be_tech_lead:bool,can_be_tech_sound:bool,can_be_tech_streaming:bool}>  $techniciansById
     * @param  array{lead:?string,sound:?string,streaming:?string}|null  $previousBoundaryAssignment
     * @param  array{lead:?string,sound:?string,streaming:?string}|null  $nextBoundaryAssignment
     * @param  array<int, string>  $requiredRoles
     */
    public function isValidCombination(
        int $weekIndex,
        array $combination,
        array $assignmentsByWeekIndex,
        array $techniciansById,
        ?array $previousBoundaryAssignment = null,
        ?array $nextBoundaryAssignment = null,
        array $requiredRoles = self::ROLES,
    ): bool {
        if (! $this->hasAllRoles($combination, $requiredRoles) || ! $this->hasDistinctRoles($combination, $requiredRoles)) {
            return false;
        }

        foreach ($requiredRoles as $role) {
            if (! $this->isTechnicianEligibleForRole($combination[$role], $role, $techniciansById)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array{lead:?string,sound:?string,streaming:?string}  $assignment
     * @param  array<int, string>  $requiredRoles
     */
    public function hasAllRoles(array $assignment, array $requiredRoles = self::ROLES): bool
    {
        foreach ($requiredRoles as $role) {
            if (empty($assignment[$role])) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array{lead:?string,sound:?string,streaming:?string}  $assignment
     * @param  array<int, string>  $roles
     */
    public function hasDistinctRoles(array $assignment, array $roles = self::ROLES): bool
    {
        $filled = array_filter(
            array_map(
                fn (string $role): ?string => $assignment[$role] ?? null,
                $roles,
            ),
            fn (?string $value): bool => $value !== null && $value !== '',
        );

        return count($filled) === count(array_unique($filled));
    }

    /**
     * @param  array<string, array{id:string,name:string,can_be_tech_lead:bool,can_be_tech_sound:bool,can_be_tech_streaming:bool}>  $techniciansById
     */
    public function isTechnicianEligibleForRole(string $technicianId, string $role, array $techniciansById): bool
    {
        $technician = $techniciansById[$technicianId] ?? null;

        if (! $technician) {
            return false;
        }

        return match ($role) {
            'lead' => (bool) $technician['can_be_tech_lead'],
            'sound' => (bool) $technician['can_be_tech_sound'],
            'streaming' => (bool) $technician['can_be_tech_streaming'],
            default => false,
        };
    }

}
