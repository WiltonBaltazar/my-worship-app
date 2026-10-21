<?php

namespace App\Support;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class MinistryAccess
{
    public const DMS = 'dms';

    public const GHJ = 'ghj';

    public const ALL = [self::DMS, self::GHJ];

    public const LABELS = [
        self::DMS => 'DMS',
        self::GHJ => 'GHJ',
    ];

    private const GHJ_HOME_GROUP = 'GHJ';

    /**
     * @return list<string>
     */
    public static function ledMinistries(User $user): array
    {
        if ($user->isAdmin()) {
            return self::ALL;
        }

        if (! $user->isLeader()) {
            return [];
        }

        $user->loadMissing('profile');
        $profile = $user->profile;

        if (! $profile) {
            return [];
        }

        return array_values(array_filter([
            $profile->leads_dms ? self::DMS : null,
            $profile->leads_ghj ? self::GHJ : null,
        ]));
    }

    public static function canManage(User $user, ?string $ministry): bool
    {
        return $ministry !== null && in_array($ministry, self::ledMinistries($user), true);
    }

    public static function scopePool(Builder $profiles, string $ministry): Builder
    {
        return $ministry === self::GHJ
            ? $profiles->where('home_group', self::GHJ_HOME_GROUP)
            : $profiles->where('in_dms', true);
    }

    /**
     * Restricts profiles to the union of the given ministries' pools.
     *
     * @param  list<string>  $ministries
     */
    public static function scopePools(Builder $profiles, array $ministries): Builder
    {
        if ($ministries === []) {
            return $profiles->whereRaw('1 = 0');
        }

        return $profiles->where(function (Builder $query) use ($ministries): void {
            foreach ($ministries as $ministry) {
                $query->orWhere(fn (Builder $poolQuery) => self::scopePool($poolQuery, $ministry));
            }
        });
    }

    public static function inPool(?Profile $profile, string $ministry): bool
    {
        if (! $profile) {
            return false;
        }

        return $ministry === self::GHJ
            ? $profile->home_group === self::GHJ_HOME_GROUP
            : (bool) $profile->in_dms;
    }

    /**
     * @param  list<string>  $ministries
     */
    public static function inAnyPool(?Profile $profile, array $ministries): bool
    {
        foreach ($ministries as $ministry) {
            if (self::inPool($profile, $ministry)) {
                return true;
            }
        }

        return false;
    }
}
