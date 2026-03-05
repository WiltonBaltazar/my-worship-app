<?php

namespace App\Support;

use App\Models\Profile;

class NormalScheduleEligibility
{
    /**
     * @var array<int, string>
     */
    public const NORMAL_FUNCTION_TYPES = [
        'lead_vocal',
        'backing_vocal',
        'instrumentalist',
    ];

    public static function isNormalFunctionType(string $functionType): bool
    {
        return in_array($functionType, self::NORMAL_FUNCTION_TYPES, true);
    }

    public static function canServeFunction(Profile $profile, string $functionType): bool
    {
        if (! self::isNormalFunctionType($functionType)) {
            return true;
        }

        return ! self::isTechOnlyProfile($profile);
    }

    public static function isTechOnlyProfile(Profile $profile): bool
    {
        $hasTechnicalCapability = (bool) (
            $profile->can_be_tech_lead
            || $profile->can_be_tech_sound
            || $profile->can_be_tech_streaming
        );

        if (! $hasTechnicalCapability) {
            return false;
        }

        $hasNormalCapability = (bool) $profile->can_lead
            || $profile->voices()->exists()
            || $profile->instruments()
                ->where('instrument', '!=', 'sound_tech')
                ->exists();

        return ! $hasNormalCapability;
    }
}
