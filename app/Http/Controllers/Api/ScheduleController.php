<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\Schedule;
use App\Models\ScheduleMember;
use App\Models\ScheduleSong;
use App\Models\SubstituteRequest;
use App\Models\User;
use App\Support\NormalScheduleEligibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ScheduleController extends Controller
{
    private const MEMBER_FUNCTION_ORDER = [
        'lead_vocal' => 0,
        'backing_vocal' => 1,
        'instrumentalist' => 2,
        'sound_tech' => 3,
    ];

    private const RESTRICTED_LEADER_HOME_GROUP = 'GHJ';

    public function index(Request $request): JsonResponse
    {
        $query = Schedule::query()
            ->orderBy('schedule_date')
            ->with([
                'members.profile:id,name,avatar_url,user_id',
                'members.profile.user.roles:user_id,role',
                'songs.song:id,title,artist',
            ]);

        if (! $request->user()->isAdmin() && ! $request->user()->isLeader()) {
            $query->where('status', '!=', 'draft');
        }

        $schedules = $query->get()->map(fn (Schedule $schedule) => $this->formatSchedule($schedule));

        return response()->json($schedules->values());
    }

    public function mySchedules(Request $request): JsonResponse
    {
        $profileId = $request->user()->profile?->id;

        if (! $profileId) {
            return response()->json([]);
        }

        $scheduleIds = ScheduleMember::query()
            ->where('profile_id', $profileId)
            ->pluck('schedule_id');

        if ($scheduleIds->isEmpty()) {
            return response()->json([]);
        }

        $schedules = Schedule::query()
            ->whereIn('id', $scheduleIds)
            ->where('status', '!=', 'draft')
            ->orderBy('schedule_date')
            ->with([
                'members.profile:id,name,avatar_url,user_id',
                'members.profile.user.roles:user_id,role',
                'songs.song:id,title,artist',
            ])
            ->get()
            ->map(fn (Schedule $schedule) => $this->formatSchedule($schedule));

        return response()->json($schedules->values());
    }

    public function create(Request $request): JsonResponse
    {
        $this->ensureLeaderAccess($request);

        $validated = $request->validate([
            'schedule_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['nullable', 'date_format:H:i:s'],
            'status' => ['nullable', 'in:draft,published,confirmed'],
            'schedule_type' => ['nullable', 'in:worship,rehearsal'],
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $schedule = Schedule::query()->create([
            ...$validated,
            'start_time' => $validated['start_time'] ?? '11:00:00',
            'status' => $validated['status'] ?? 'draft',
            'schedule_type' => $validated['schedule_type'] ?? 'worship',
            'created_by' => $request->user()->id,
        ]);

        $schedule->load([
            'members.profile:id,name,avatar_url,user_id',
            'members.profile.user.roles:user_id,role',
            'songs.song:id,title,artist',
        ]);

        return response()->json($this->formatSchedule($schedule), 201);
    }

    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $this->ensureLeaderAccess($request);

        $validated = $request->validate([
            'schedule_date' => ['sometimes', 'date', 'after_or_equal:today'],
            'start_time' => ['nullable', 'date_format:H:i:s'],
            'status' => ['sometimes', 'in:draft,published,confirmed'],
            'schedule_type' => ['sometimes', 'in:worship,rehearsal'],
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $schedule->update($validated);

        $schedule->load([
            'members.profile:id,name,avatar_url,user_id',
            'members.profile.user.roles:user_id,role',
            'songs.song:id,title,artist',
        ]);

        return response()->json($this->formatSchedule($schedule));
    }

    public function destroy(Request $request, Schedule $schedule): JsonResponse
    {
        $this->ensureLeaderAccess($request);

        $schedule->delete();

        return response()->json(['message' => 'Schedule deleted.']);
    }

    public function addMember(Request $request, Schedule $schedule): JsonResponse
    {
        $this->ensureLeaderAccess($request);

        $validated = $request->validate([
            'profile_id' => ['required', 'exists:profiles,id'],
            'function_type' => ['required', 'in:lead_vocal,backing_vocal,instrumentalist'],
            'function_detail' => ['nullable', 'string', 'max:255'],
            'confirmed' => ['nullable', 'boolean'],
            'can_edit' => ['nullable', 'boolean'],
        ]);

        $profile = Profile::query()
            ->with(['user.roles:user_id,role', 'unavailableDates', 'instruments', 'voices'])
            ->findOrFail($validated['profile_id']);

        $this->ensureLeaderCanManageProfile($request, $profile);

        if ($this->profileIsAdmin($profile)) {
            throw ValidationException::withMessages([
                'profile_id' => ['Administradores não podem ser escalados como membros.'],
            ]);
        }

        $this->ensureProfileEligibleForNormalSchedule($profile, $validated['function_type'], 'profile_id');
        $this->ensureProfileAvailableForSchedule($profile, $schedule, 'profile_id');

        $member = ScheduleMember::query()->create([
            'schedule_id' => $schedule->id,
            'profile_id' => $validated['profile_id'],
            'function_type' => $validated['function_type'],
            'function_detail' => $validated['function_detail'] ?? null,
            'confirmed' => $validated['confirmed'] ?? true,
            'can_edit' => $validated['can_edit'] ?? false,
        ]);

        $member->load('profile:id,name,avatar_url,user_id');

        return response()->json($this->formatMember($member), 201);
    }

    public function updateMember(Request $request, ScheduleMember $member): JsonResponse
    {
        $member->loadMissing('profile');

        $user = $request->user();

        $isAdminOrLeader = $user->isAdmin() || $user->isLeader();
        $isOwner = $member->profile?->user_id === $user->id;
        $requestProfileId = $user->profile?->id;
        $isScheduleLead = $requestProfileId
            ? $this->isScheduleLead($requestProfileId, $member->schedule_id)
            : false;

        if (! $isOwner && ! $isAdminOrLeader && ! $isScheduleLead) {
            abort(403, 'Forbidden.');
        }

        if ($isAdminOrLeader) {
            $this->ensureLeaderCanManageProfile($request, $member->profile);
        }

        $validated = $request->validate([
            'function_type' => ['sometimes', 'in:lead_vocal,backing_vocal,instrumentalist'],
            'function_detail' => ['nullable', 'string', 'max:255'],
            'confirmed' => ['sometimes', 'boolean'],
            'can_edit' => ['sometimes', 'boolean'],
            'requested_change' => ['sometimes', 'boolean'],
            'change_reason' => ['nullable', 'string'],
            'suggested_substitute_id' => ['nullable', 'exists:profiles,id'],
        ]);

        if (
            ! $isAdminOrLeader
            && $isOwner
            && $this->hasAnyKey($validated, ['function_type', 'function_detail', 'can_edit'])
        ) {
            abort(403, 'Forbidden.');
        }

        if (
            ! $isAdminOrLeader
            && ! $isOwner
            && $isScheduleLead
            && $this->hasAnyKey($validated, ['function_type', 'function_detail', 'confirmed', 'requested_change', 'change_reason', 'suggested_substitute_id'])
        ) {
            abort(403, 'Forbidden.');
        }

        if (array_key_exists('can_edit', $validated) && ! $isAdminOrLeader && ! $isScheduleLead) {
            abort(403, 'Forbidden.');
        }

        if (! empty($validated['suggested_substitute_id'])) {
            $suggestedSubstitute = Profile::query()
                ->with('user.roles:user_id,role')
                ->findOrFail($validated['suggested_substitute_id']);

            if ($this->profileIsAdmin($suggestedSubstitute)) {
                throw ValidationException::withMessages([
                    'suggested_substitute_id' => ['Administradores não podem ser selecionados como substitutos.'],
                ]);
            }
        }

        if (array_key_exists('function_type', $validated)) {
            $member->loadMissing('profile');
            $profile = $member->profile;

            if ($profile) {
                $profile->loadMissing(['instruments', 'voices']);
                $this->ensureProfileEligibleForNormalSchedule($profile, $validated['function_type'], 'function_type');
            }
        }

        $member->update($validated);
        $member->load('profile:id,name,avatar_url,user_id');

        return response()->json($this->formatMember($member));
    }

    public function removeMember(Request $request, ScheduleMember $member): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && ! $user->isLeader()) {
            abort(403, 'Forbidden.');
        }

        $member->loadMissing([
            'profile:id,name,user_id',
            'schedule:id,schedule_date,status',
        ]);

        $this->ensureLeaderCanManageProfile($request, $member->profile);

        $removedProfile = $member->profile;
        $schedule = $member->schedule;
        $hadRequestedChange = (bool) $member->requested_change;
        $isPublishedSchedule = $schedule && in_array($schedule->status, ['published', 'confirmed'], true);

        DB::transaction(function () use ($member, $hadRequestedChange, $removedProfile): void {
            if ($hadRequestedChange) {
                SubstituteRequest::query()
                    ->where('schedule_member_id', $member->id)
                    ->delete();

                if ($removedProfile?->name) {
                    AppNotification::query()
                        ->where('schedule_id', $member->schedule_id)
                        ->where('type', 'change_request')
                        ->where('message', $removedProfile->name . ' solicitou troca e precisa de um substituto.')
                        ->delete();
                }
            }

            $member->delete();
        });

        if ($hadRequestedChange && $removedProfile?->user_id) {
            $scheduleDate = optional($schedule?->schedule_date)->format('d/m/Y');
            $message = $scheduleDate
                ? "Sua solicitação de troca na escala de {$scheduleDate} foi resolvida. Você foi removido(a) da escala."
                : 'Sua solicitação de troca foi resolvida. Você foi removido(a) da escala.';

            AppNotification::query()->create([
                'user_id' => $removedProfile->user_id,
                'schedule_id' => $member->schedule_id,
                'title' => 'Solicitação de troca resolvida',
                'message' => $message,
                'type' => 'change_request',
            ]);
        } elseif ($isPublishedSchedule && $removedProfile?->user_id) {
            $scheduleDate = optional($schedule?->schedule_date)->format('d/m/Y');
            $message = $scheduleDate
                ? "Você foi removido(a) da escala de {$scheduleDate}."
                : 'Você foi removido(a) de uma escala.';

            AppNotification::query()->create([
                'user_id' => $removedProfile->user_id,
                'schedule_id' => $member->schedule_id,
                'title' => 'Removido da escala',
                'message' => $message,
                'type' => 'schedule',
            ]);
        }

        return response()->json(['message' => 'Member removed.']);
    }

    public function syncSongs(Request $request, Schedule $schedule): JsonResponse
    {
        $this->ensureScheduleSongManagementAccess($request, $schedule);

        $validated = $request->validate([
            'songs' => ['present', 'array'],
            'songs.*.song_id' => ['required', 'exists:songs,id'],
            'songs.*.order_position' => ['nullable', 'integer', 'min:0'],
            'songs.*.notes' => ['nullable', 'string'],
        ]);

        ScheduleSong::query()->where('schedule_id', $schedule->id)->delete();

        foreach ($validated['songs'] as $index => $song) {
            ScheduleSong::query()->create([
                'schedule_id' => $schedule->id,
                'song_id' => $song['song_id'],
                'order_position' => $song['order_position'] ?? $index,
                'notes' => $song['notes'] ?? null,
            ]);
        }

        $schedule->load([
            'members.profile:id,name,avatar_url,user_id',
            'members.profile.user.roles:user_id,role',
            'songs.song:id,title,artist',
        ]);

        return response()->json($this->formatSchedule($schedule));
    }

    private function formatSchedule(Schedule $schedule): array
    {
        $eligibleMembers = $schedule->members->filter(
            fn (ScheduleMember $member) => ! $this->profileIsAdmin($member->profile),
        );

        return [
            'id' => $schedule->id,
            'schedule_date' => optional($schedule->schedule_date)->format('Y-m-d'),
            'start_time' => $schedule->start_time,
            'status' => $schedule->status,
            'schedule_type' => $schedule->schedule_type,
            'title' => $schedule->title,
            'notes' => $schedule->notes,
            'created_at' => optional($schedule->created_at)?->toISOString(),
            'updated_at' => optional($schedule->updated_at)?->toISOString(),
            'members' => $this->sortScheduleMembers($eligibleMembers)
                ->map(fn (ScheduleMember $member) => $this->formatMember($member))
                ->values()
                ->all(),
            'songs' => $schedule->songs
                ->sortBy('order_position')
                ->map(fn (ScheduleSong $song) => [
                    'id' => $song->id,
                    'song_id' => $song->song_id,
                    'order_position' => $song->order_position,
                    'notes' => $song->notes,
                    'song' => $song->song ? [
                        'id' => $song->song->id,
                        'title' => $song->song->title,
                        'artist' => $song->song->artist,
                    ] : null,
                ])
                ->values()
                ->all(),
        ];
    }

    private function formatMember(ScheduleMember $member): array
    {
        return [
            'id' => $member->id,
            'profile_id' => $member->profile_id,
            'function_type' => $member->function_type,
            'function_detail' => $member->function_detail,
            'confirmed' => (bool) $member->confirmed,
            'can_edit' => (bool) $member->can_edit,
            'requested_change' => (bool) $member->requested_change,
            'change_reason' => $member->change_reason,
            'suggested_substitute_id' => $member->suggested_substitute_id,
            'profile' => $member->profile ? [
                'id' => $member->profile->id,
                'name' => $member->profile->name,
                'avatar_url' => $member->profile->avatar_url,
                'user_id' => $member->profile->user_id,
            ] : null,
        ];
    }

    private function sortScheduleMembers($members)
    {
        return $members->sort(function (ScheduleMember $left, ScheduleMember $right) {
            $leftOrder = self::MEMBER_FUNCTION_ORDER[$left->function_type] ?? 99;
            $rightOrder = self::MEMBER_FUNCTION_ORDER[$right->function_type] ?? 99;

            if ($leftOrder !== $rightOrder) {
                return $leftOrder <=> $rightOrder;
            }

            return strcasecmp($left->profile?->name ?? '', $right->profile?->name ?? '');
        });
    }

    private function hasAnyKey(array $payload, array $keys): bool
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $payload)) {
                return true;
            }
        }

        return false;
    }

    private function isScheduleLead(string $profileId, string $scheduleId): bool
    {
        return ScheduleMember::query()
            ->where('schedule_id', $scheduleId)
            ->where('profile_id', $profileId)
            ->where('function_type', 'lead_vocal')
            ->exists();
    }

    private function hasScheduleSongEditPermission(Request $request, Schedule $schedule): bool
    {
        $user = $request->user();

        if ($user->isAdmin() || $user->isLeader()) {
            return true;
        }

        $profileId = $user->profile?->id;

        if (! $profileId) {
            return false;
        }

        return ScheduleMember::query()
            ->where('schedule_id', $schedule->id)
            ->where('profile_id', $profileId)
            ->where(function ($query): void {
                $query
                    ->where('function_type', 'lead_vocal')
                    ->orWhere('can_edit', true);
            })
            ->exists();
    }

    private function profileIsAdmin(?Profile $profile): bool
    {
        if (! $profile) {
            return false;
        }

        return (bool) $profile->user?->roles?->contains('role', 'admin');
    }

    private function ensureLeaderAccess(Request $request): void
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isLeader()) {
            abort(403, 'Forbidden.');
        }
    }

    private function ensureScheduleSongManagementAccess(Request $request, Schedule $schedule): void
    {
        if (! $this->hasScheduleSongEditPermission($request, $schedule)) {
            abort(403, 'Forbidden.');
        }
    }

    private function ensureProfileAvailableForSchedule(Profile $profile, Schedule $schedule, string $field): void
    {
        if (! $schedule->schedule_date || ! $profile->isUnavailableOnDate($schedule->schedule_date)) {
            return;
        }

        $formattedDate = $schedule->schedule_date->format('d/m/Y');

        throw ValidationException::withMessages([
            $field => ["{$profile->name} está indisponível em {$formattedDate}."],
        ]);
    }

    private function ensureProfileEligibleForNormalSchedule(Profile $profile, string $functionType, string $field): void
    {
        if (NormalScheduleEligibility::canServeFunction($profile, $functionType)) {
            return;
        }

        throw ValidationException::withMessages([
            $field => ['Este membro tem apenas habilidades técnicas de som. Adicione voz, instrumento ou capacidade de dirigir para escalá-lo na escala normal.'],
        ]);
    }

    private function ensureLeaderCanManageProfile(Request $request, ?Profile $profile): void
    {
        $user = $request->user()->loadMissing('profile');

        if (! $this->isRestrictedHomeGroupLeader($user)) {
            return;
        }

        if (($profile?->home_group) !== self::RESTRICTED_LEADER_HOME_GROUP) {
            abort(403, 'Forbidden.');
        }
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
