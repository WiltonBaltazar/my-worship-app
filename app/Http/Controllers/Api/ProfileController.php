<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
use App\Support\MinistryAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    private const INSTRUMENTS = [
        'guitar',
        'bass',
        'drums',
        'keyboard',
        'acoustic_guitar',
        'violin',
        'percussion',
        'other',
    ];

    private const VOICES = [
        'soprano',
        'alto',
        'tenor',
        'bass_voice',
        'lead',
    ];

    private const HOME_GROUPS = [
        'GHH',
        'GHS',
        'GHJ',
        'GHC',
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');

        $status = (string) $request->query('status', 'approved');
        $status = in_array($status, ['approved', 'pending', 'all'], true) ? $status : 'approved';

        $activity = (string) $request->query('activity', 'active');
        $activity = in_array($activity, ['active', 'inactive', 'all'], true) ? $activity : 'active';

        $profilesQuery = Profile::query()
            ->with(['instruments', 'voices', 'unavailableDates', 'unavailablePeriods', 'user.roles'])
            ->orderBy('name');

        $this->applyMinistryScope($request, $user, $profilesQuery);

        if ($status === 'approved') {
            $profilesQuery->where('is_approved', true);
        } elseif ($status === 'pending') {
            if (! $this->canManagePendingApprovals($request)) {
                abort(403, 'Forbidden.');
            }

            $profilesQuery->where('is_approved', false);
        } elseif (! $user->isAdmin()) {
            abort(403, 'Forbidden.');
        }

        if ($activity === 'active') {
            $profilesQuery->where('is_active', true);
        } elseif ($activity === 'inactive') {
            if (! $user->isAdmin()) {
                abort(403, 'Forbidden.');
            }

            $profilesQuery->where('is_active', false);
        } elseif (! $user->isAdmin()) {
            abort(403, 'Forbidden.');
        }

        $profiles = $profilesQuery
            ->get()
            ->map(fn (Profile $profile): array => $this->formatProfile($profile))
            ->values();

        return response()->json($profiles);
    }

    public function pendingCount(Request $request): JsonResponse
    {
        if (! $this->canManagePendingApprovals($request)) {
            abort(403, 'Forbidden.');
        }

        $user = $request->user()->loadMissing('profile');

        $countQuery = Profile::query()
            ->where('is_approved', false)
            ->where('is_active', true);

        $this->scopeToVisibleProfiles($user, $countQuery);

        $count = $countQuery->count();

        return response()->json([
            'count' => $count,
        ]);
    }

    public function update(Request $request, Profile $profile): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $isLeader = $user->isLeader();
        $isOwnProfile = $profile->user_id === $user->id;

        if (! $isOwnProfile && ! $isAdmin && ! $isLeader) {
            abort(403, 'Forbidden.');
        }

        $ledMinistries = MinistryAccess::ledMinistries($user);

        if (! $isAdmin && ! $isOwnProfile && ! $this->canSeeProfile($ledMinistries, $profile)) {
            abort(403, 'Forbidden.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($profile->user_id),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'home_group' => ['nullable', 'string', Rule::in(self::HOME_GROUPS)],
            'in_dms' => ['sometimes', 'boolean'],
            'leads_dms' => ['sometimes', 'boolean'],
            'leads_ghj' => ['sometimes', 'boolean'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
            'can_lead' => ['sometimes', 'boolean'],
            'can_be_tech_lead' => ['sometimes', 'boolean'],
            'can_be_tech_sound' => ['sometimes', 'boolean'],
            'can_be_tech_streaming' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'is_approved' => ['sometimes', 'boolean'],
            'role' => ['sometimes', 'in:admin,leader,member,sound_tech'],
            'instruments' => ['sometimes', 'array'],
            'instruments.*' => ['string', Rule::in(self::INSTRUMENTS)],
            'voices' => ['sometimes', 'array'],
            'voices.*' => ['string', Rule::in(self::VOICES)],
            'unavailable_dates' => ['sometimes', 'array'],
            'unavailable_dates.*' => ['date_format:Y-m-d', 'distinct'],
            'unavailable_periods' => ['sometimes', 'array', 'max:50'],
            'unavailable_periods.*.start_date' => ['required', 'date_format:Y-m-d'],
            'unavailable_periods.*.end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:unavailable_periods.*.start_date'],
            'is_paused' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        if (! $isAdmin) {
            unset($validated['role']);

            unset($validated['leads_dms'], $validated['leads_ghj']);

            if (! in_array(MinistryAccess::DMS, $ledMinistries, true)) {
                unset($validated['in_dms']);
            }

            $isDmsRosterUpdate = array_key_exists('in_dms', $validated)
                && collect($validated)->except('in_dms')->isEmpty();

            // Leaders may pause or resume members of the ministries they lead.
            $isLeaderPauseUpdate = ! $isOwnProfile
                && array_key_exists('is_paused', $validated)
                && collect($validated)->except('is_paused')->isEmpty()
                && MinistryAccess::inAnyPool($profile, $ledMinistries);

            if ($isOwnProfile) {
                unset($validated['home_group'], $validated['can_lead'], $validated['is_active'], $validated['is_approved']);
                unset($validated['can_be_tech_lead'], $validated['can_be_tech_sound'], $validated['can_be_tech_streaming']);
            } elseif (! $isDmsRosterUpdate && ! $isLeaderPauseUpdate) {
                $validated = collect($validated)
                    ->only(['is_active', 'is_approved'])
                    ->all();

                if ($validated === []) {
                    abort(403, 'Forbidden.');
                }

                if ((bool) $profile->is_approved || ! (bool) $profile->is_active) {
                    abort(403, 'Forbidden.');
                }

                $isApproving = array_key_exists('is_approved', $validated) && (bool) $validated['is_approved'] === true;
                $isRejecting = array_key_exists('is_active', $validated) && (bool) $validated['is_active'] === false;

                if (! $isApproving && ! $isRejecting) {
                    abort(403, 'Forbidden.');
                }
            }
        }

        DB::transaction(function () use ($profile, $validated): void {
            $profileUpdates = collect($validated)
                ->only([
                    'name',
                    'email',
                    'phone',
                    'home_group',
                    'in_dms',
                    'leads_dms',
                    'leads_ghj',
                    'avatar_url',
                    'can_lead',
                    'can_be_tech_lead',
                    'can_be_tech_sound',
                    'can_be_tech_streaming',
                    'is_active',
                    'is_approved',
                ])
                ->all();

            if (array_key_exists('is_paused', $validated)) {
                // Keep the original pause date when the flag is re-sent unchanged.
                $profileUpdates['paused_at'] = $validated['is_paused'] ? ($profile->paused_at ?? now()) : null;
            }

            if ($profileUpdates !== []) {
                $profile->update($profileUpdates);
            }

            $userUpdates = [];

            if (array_key_exists('name', $validated)) {
                $userUpdates['name'] = $validated['name'];
            }

            if (array_key_exists('email', $validated)) {
                $userUpdates['email'] = $validated['email'];
            }

            if ($userUpdates !== []) {
                $profile->user()->update($userUpdates);
            }

            if (array_key_exists('role', $validated)) {
                $this->assignDefaultLeadership($profile, $validated);

                UserRole::query()->where('user_id', $profile->user_id)->delete();
                UserRole::query()->create([
                    'user_id' => $profile->user_id,
                    'role' => $validated['role'],
                ]);
            }

            if (array_key_exists('instruments', $validated)) {
                $profile->instruments()->delete();

                $instruments = collect($validated['instruments'] ?? [])
                    ->unique()
                    ->values()
                    ->all();

                if ($instruments !== []) {
                    $profile->instruments()->createMany(
                        collect($instruments)
                            ->map(fn (string $instrument): array => ['instrument' => $instrument])
                            ->all(),
                    );
                }
            }

            if (array_key_exists('voices', $validated)) {
                $profile->voices()->delete();

                $voices = collect($validated['voices'] ?? [])
                    ->unique()
                    ->values()
                    ->all();

                if ($voices !== []) {
                    $profile->voices()->createMany(
                        collect($voices)
                            ->map(fn (string $voice): array => ['voice_type' => $voice])
                            ->all(),
                    );
                }
            }

            if (array_key_exists('unavailable_dates', $validated)) {
                $profile->unavailableDates()->delete();

                $unavailableDates = collect($validated['unavailable_dates'] ?? [])
                    ->unique()
                    ->values()
                    ->all();

                if ($unavailableDates !== []) {
                    $profile->unavailableDates()->createMany(
                        collect($unavailableDates)
                            ->map(fn (string $date): array => ['unavailable_date' => $date])
                            ->all(),
                    );
                }
            }

            if (array_key_exists('unavailable_periods', $validated)) {
                $profile->unavailablePeriods()->delete();

                $periods = collect($validated['unavailable_periods'] ?? [])
                    ->map(fn (array $period): array => [
                        'start_date' => $period['start_date'],
                        'end_date' => $period['end_date'],
                    ])
                    ->unique(fn (array $period): string => $period['start_date'].'|'.$period['end_date'])
                    ->values()
                    ->all();

                if ($periods !== []) {
                    $profile->unavailablePeriods()->createMany($periods);
                }
            }
        });

        $profile->refresh()->load(['instruments', 'voices', 'unavailableDates', 'unavailablePeriods', 'user.roles']);

        return response()->json($this->formatProfile($profile));
    }

    public function destroy(Request $request, Profile $profile): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Forbidden.');
        }

        $profile->update(['is_active' => false]);

        return response()->json([
            'message' => 'Profile deactivated.',
        ]);
    }

    public function setTemporaryPassword(Request $request, Profile $profile): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Forbidden.');
        }

        $profile->loadMissing('user');

        $temporaryPassword = $this->generateTemporaryPassword();

        $profile->user->update(['password' => $temporaryPassword]);
        $profile->user->revokeAllTokens();

        return response()->json([
            'message' => 'Senha temporária definida com sucesso.',
            'temporary_password' => $temporaryPassword,
        ]);
    }

    private function generateTemporaryPassword(): string
    {
        // Excludes visually ambiguous characters (0/O, 1/l/I) so it's easy to read aloud or retype.
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

        $password = '';

        for ($i = 0; $i < 10; $i++) {
            $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $password;
    }

    private function formatProfile(Profile $profile): array
    {
        return [
            'id' => $profile->id,
            'user_id' => $profile->user_id,
            'name' => $profile->name,
            'email' => $profile->email,
            'avatar_url' => $profile->avatar_url,
            'phone' => $profile->phone,
            'home_group' => $profile->home_group,
            'in_dms' => (bool) $profile->in_dms,
            'leads_dms' => (bool) $profile->leads_dms,
            'leads_ghj' => (bool) $profile->leads_ghj,
            'can_lead' => $profile->can_lead,
            'can_be_tech_lead' => (bool) $profile->can_be_tech_lead,
            'can_be_tech_sound' => (bool) $profile->can_be_tech_sound,
            'can_be_tech_streaming' => (bool) $profile->can_be_tech_streaming,
            'is_active' => $profile->is_active,
            'is_approved' => $profile->is_approved,
            'created_at' => $profile->created_at,
            'updated_at' => $profile->updated_at,
            'role' => $profile->user?->roles?->first()?->role,
            'instruments' => $profile->instruments
                ->pluck('instrument')
                ->reject(fn (string $instrument): bool => $instrument === 'sound_tech')
                ->values()
                ->all(),
            'voices' => $profile->voices->pluck('voice_type')->values()->all(),
            'unavailable_dates' => $profile->unavailableDates
                ->map(fn ($dateRecord) => $dateRecord->unavailable_date?->format('Y-m-d'))
                ->filter()
                ->values()
                ->all(),
            'unavailable_periods' => $profile->unavailablePeriods
                ->map(fn ($period) => [
                    'start_date' => $period->start_date?->format('Y-m-d'),
                    'end_date' => $period->end_date?->format('Y-m-d'),
                ])
                ->values()
                ->all(),
            'is_paused' => $profile->isPaused(),
            'paused_at' => $profile->paused_at?->toISOString(),
        ];
    }

    /**
     * A newly promoted leader with no ministry yet leads the one matching their home group,
     * unless the request sets the leadership flags explicitly.
     */
    private function assignDefaultLeadership(Profile $profile, array $validated): void
    {
        if (
            $validated['role'] !== 'leader'
            || array_key_exists('leads_dms', $validated)
            || array_key_exists('leads_ghj', $validated)
            || $profile->leads_dms
            || $profile->leads_ghj
        ) {
            return;
        }

        $profile->update($profile->home_group === 'GHJ' ? ['leads_ghj' => true] : ['leads_dms' => true]);
    }

    private function canManagePendingApprovals(Request $request): bool
    {
        return $request->user()->isAdmin() || $request->user()->isLeader();
    }

    private function applyMinistryScope(Request $request, User $user, Builder $profilesQuery): void
    {
        $ministry = $request->query('ministry');

        if ($ministry !== null && ! in_array($ministry, MinistryAccess::ALL, true)) {
            abort(422, 'Invalid ministry.');
        }

        if ($ministry === null) {
            $this->scopeToVisibleProfiles($user, $profilesQuery);

            return;
        }

        // Pools are public to everyone who can list profiles: members pick substitutes from them too.
        MinistryAccess::scopePool($profilesQuery, $ministry);
    }

    /**
     * DMS draws from the whole church, so DMS leaders see everyone (and can grow the
     * roster); leaders of GHJ only are limited to the GHJ pool.
     */
    private function scopeToVisibleProfiles(User $user, Builder $profilesQuery): void
    {
        if ($user->isAdmin() || ! $user->isLeader()) {
            return;
        }

        $ledMinistries = MinistryAccess::ledMinistries($user);

        if (! in_array(MinistryAccess::DMS, $ledMinistries, true)) {
            MinistryAccess::scopePools($profilesQuery, $ledMinistries);
        }
    }

    /**
     * @param  list<string>  $ledMinistries
     */
    private function canSeeProfile(array $ledMinistries, Profile $profile): bool
    {
        return in_array(MinistryAccess::DMS, $ledMinistries, true)
            || MinistryAccess::inAnyPool($profile, $ledMinistries);
    }
}
