<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
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

    private const RESTRICTED_LEADER_HOME_GROUP = 'GHJ';

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');

        $status = (string) $request->query('status', 'approved');
        $status = in_array($status, ['approved', 'pending', 'all'], true) ? $status : 'approved';

        $activity = (string) $request->query('activity', 'active');
        $activity = in_array($activity, ['active', 'inactive', 'all'], true) ? $activity : 'active';

        $profilesQuery = Profile::query()
            ->with(['instruments', 'voices', 'unavailableDates', 'user.roles'])
            ->orderBy('name');

        if ($this->isRestrictedHomeGroupLeader($user)) {
            $profilesQuery->where('home_group', self::RESTRICTED_LEADER_HOME_GROUP);
        }

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

        if ($this->isRestrictedHomeGroupLeader($user)) {
            $countQuery->where('home_group', self::RESTRICTED_LEADER_HOME_GROUP);
        }

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

        if (
            ! $isAdmin
            && ! $isOwnProfile
            && $this->isRestrictedHomeGroupLeader($user)
            && $profile->home_group !== self::RESTRICTED_LEADER_HOME_GROUP
        ) {
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
        ]);

        if (isset($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        if (! $isAdmin) {
            unset($validated['role']);

            if ($isOwnProfile) {
                unset($validated['home_group'], $validated['can_lead'], $validated['is_active'], $validated['is_approved']);
                unset($validated['can_be_tech_lead'], $validated['can_be_tech_sound'], $validated['can_be_tech_streaming']);
            } else {
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
                    'avatar_url',
                    'can_lead',
                    'can_be_tech_lead',
                    'can_be_tech_sound',
                    'can_be_tech_streaming',
                    'is_active',
                    'is_approved',
                ])
                ->all();

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
        });

        $profile->refresh()->load(['instruments', 'voices', 'unavailableDates', 'user.roles']);

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
        ];
    }

    private function canManagePendingApprovals(Request $request): bool
    {
        return $request->user()->isAdmin() || $request->user()->isLeader();
    }

    private function isRestrictedHomeGroupLeader(User $user): bool
    {
        if ($user->isAdmin() || ! $user->isLeader()) {
            return false;
        }

        $user->loadMissing('profile');

        return $user->profile?->home_group === self::RESTRICTED_LEADER_HOME_GROUP;
    }
}
