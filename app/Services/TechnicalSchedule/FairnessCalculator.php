<?php

namespace App\Services\TechnicalSchedule;

class FairnessCalculator
{
    /**
     * @param  array<string, int>  $loadByTechnician
     */
    public function getFairnessScore(array $loadByTechnician): int
    {
        if ($loadByTechnician === []) {
            return 0;
        }

        return max($loadByTechnician) - min($loadByTechnician);
    }

    /**
     * Penaliza concentração de uma mesma função na mesma pessoa.
     *
     * @param  array<string, array{lead:int,sound:int,streaming:int}>  $roleLoadByTechnician
     */
    public function getRoleRepetitionScore(array $roleLoadByTechnician): int
    {
        $score = 0;

        foreach ($roleLoadByTechnician as $roleLoad) {
            $score += ($roleLoad['lead'] ** 2) + ($roleLoad['sound'] ** 2) + ($roleLoad['streaming'] ** 2);
        }

        return $score;
    }
}
