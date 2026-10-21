<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\Schedule;
use App\Models\ScheduleGuest;
use App\Support\MinistryAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ScheduleGuestController extends Controller
{
    public function store(Request $request, Schedule $schedule): JsonResponse
    {
        $this->ensureCanManage($request, $schedule);

        $guest = $schedule->guests()->create([
            ...$this->validated($request, $schedule),
            'order_position' => (int) $schedule->guests()->max('order_position') + 1,
        ]);

        $this->notifyPresenter($guest, $schedule);

        return response()->json(self::format($guest->load('profile:id,name,avatar_url')), 201);
    }

    public function update(Request $request, ScheduleGuest $guest): JsonResponse
    {
        $schedule = $guest->schedule;
        $this->ensureCanManage($request, $schedule);

        $previousProfileId = $guest->profile_id;
        $guest->update($this->validated($request, $schedule));

        if ($guest->profile_id !== $previousProfileId) {
            $this->notifyPresenter($guest, $schedule);
        }

        return response()->json(self::format($guest->load('profile:id,name,avatar_url')));
    }

    public function destroy(Request $request, ScheduleGuest $guest): JsonResponse
    {
        $this->ensureCanManage($request, $guest->schedule);

        $guest->delete();

        return response()->json(['message' => 'Guest removed.']);
    }

    public static function format(ScheduleGuest $guest): array
    {
        $profile = $guest->relationLoaded('profile') ? $guest->profile : null;

        return [
            'id' => $guest->id,
            'profile_id' => $guest->profile_id,
            // A member's current name wins over the snapshot taken when they were added.
            'name' => $profile?->name ?? $guest->name,
            'avatar_url' => $profile?->avatar_url,
            'role' => $guest->role,
            'song_title' => $guest->song_title,
            'song_url' => $guest->song_url,
            'notes' => $guest->notes,
            'order_position' => $guest->order_position,
        ];
    }

    private function validated(Request $request, Schedule $schedule): array
    {
        $validated = $request->validate([
            'profile_id' => ['nullable', 'uuid', 'exists:profiles,id'],
            'name' => ['required_without:profile_id', 'nullable', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:100'],
            'song_title' => ['nullable', 'string', 'max:255'],
            'song_url' => ['nullable', 'url:http,https', 'max:2048'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $profile = isset($validated['profile_id']) ? Profile::query()->find($validated['profile_id']) : null;

        if ($profile && ! MinistryAccess::inPool($profile, $schedule->ministry)) {
            $ministryLabel = MinistryAccess::LABELS[$schedule->ministry] ?? strtoupper($schedule->ministry);

            throw ValidationException::withMessages([
                'profile_id' => ["{$profile->name} não pertence ao {$ministryLabel}."],
            ]);
        }

        return [
            'profile_id' => $profile?->id,
            'name' => $profile ? $profile->name : trim($validated['name']),
            'role' => trim($validated['role']),
            'song_title' => filled($validated['song_title'] ?? null) ? trim($validated['song_title']) : null,
            'song_url' => $validated['song_url'] ?? null,
            'notes' => filled($validated['notes'] ?? null) ? trim($validated['notes']) : null,
        ];
    }

    /**
     * Members presenting on a published schedule are told right away; on drafts the
     * schedule isn't visible to them yet, so there is nothing to link to.
     */
    private function notifyPresenter(ScheduleGuest $guest, Schedule $schedule): void
    {
        if (! $guest->profile_id || ! in_array($schedule->status, ['published', 'confirmed'], true)) {
            return;
        }

        $userId = Profile::query()->whereKey($guest->profile_id)->value('user_id');

        if (! $userId) {
            return;
        }

        $scheduleDate = optional($schedule->schedule_date)->format('d/m/Y');
        $what = $guest->song_title ? "{$guest->role}: {$guest->song_title}" : $guest->role;

        AppNotification::query()->create([
            'user_id' => $userId,
            'schedule_id' => $schedule->id,
            'title' => 'Participação especial',
            'message' => $scheduleDate
                ? "Você tem uma participação na escala de {$scheduleDate} ({$what})."
                : "Você tem uma participação especial ({$what}).",
            'type' => 'schedule',
        ]);
    }

    private function ensureCanManage(Request $request, ?Schedule $schedule): void
    {
        if (! $schedule || ! MinistryAccess::canManage($request->user(), $schedule->ministry)) {
            abort(403, 'Forbidden.');
        }
    }
}
