<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\Schedule;
use App\Models\ScheduleAvailabilityResponse;
use App\Models\User;
use App\Support\MinistryAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * "Convocatórias": a leader asks the ministry pool who can serve on a schedule,
 * members answer, and the leader assigns functions to those who said yes.
 */
class AvailabilityCallController extends Controller
{
    /**
     * Open calls the current member can answer, with their current answer.
     */
    public function index(Request $request): JsonResponse
    {
        $profile = $request->user()->profile;

        if (! $profile || $request->user()->isAdmin() || $profile->isPaused()) {
            return response()->json([]);
        }

        $ministries = array_values(array_filter(
            MinistryAccess::ALL,
            fn (string $ministry) => MinistryAccess::inPool($profile, $ministry),
        ));

        if ($ministries === []) {
            return response()->json([]);
        }

        $schedules = Schedule::query()
            ->withOpenCall()
            ->whereIn('ministry', $ministries)
            ->whereDate('schedule_date', '>=', Carbon::today())
            ->with([
                'availabilityResponses' => fn ($query) => $query->where('profile_id', $profile->id),
                'members' => fn ($query) => $query->where('profile_id', $profile->id),
            ])
            ->orderBy('schedule_date')
            ->get();

        return response()->json($schedules->map(fn (Schedule $schedule) => [
            'schedule_id' => $schedule->id,
            'schedule_date' => optional($schedule->schedule_date)->format('Y-m-d'),
            'start_time' => $schedule->start_time,
            'title' => $schedule->title,
            'ministry' => $schedule->ministry,
            'deadline' => $schedule->call_deadline?->toISOString(),
            'my_response' => $schedule->availabilityResponses->first()?->available,
            'is_scheduled' => $schedule->members->isNotEmpty(),
        ])->values());
    }

    public function open(Request $request, Schedule $schedule): JsonResponse
    {
        $this->ensureCanManage($request, $schedule);

        $validated = $request->validate([
            'deadline' => ['nullable', 'date', 'after:now'],
        ]);

        $wasOpen = $schedule->isCallOpen();

        $schedule->update([
            'call_opened_at' => $wasOpen ? $schedule->call_opened_at : Carbon::now(),
            'call_closed_at' => null,
            'call_deadline' => isset($validated['deadline']) ? Carbon::parse($validated['deadline']) : null,
        ]);

        // Only notify when the call goes from closed to open; editing the deadline shouldn't re-ping everyone.
        if (! $wasOpen) {
            $this->notifyPool($request->user(), $schedule);
        }

        return response()->json($this->formatCall($schedule->fresh()));
    }

    public function close(Request $request, Schedule $schedule): JsonResponse
    {
        $this->ensureCanManage($request, $schedule);

        if ($schedule->call_opened_at && ! $schedule->call_closed_at) {
            $schedule->update(['call_closed_at' => Carbon::now()]);
        }

        return response()->json($this->formatCall($schedule->fresh()));
    }

    public function respond(Request $request, Schedule $schedule): JsonResponse
    {
        $validated = $request->validate([
            'available' => ['required', 'boolean'],
        ]);

        $user = $request->user();
        $profile = $user->profile;

        if (! $schedule->isCallOpen()) {
            throw ValidationException::withMessages([
                'available' => ['Esta convocatória já foi encerrada.'],
            ]);
        }

        if (! $profile || $user->isAdmin() || ! MinistryAccess::inPool($profile, $schedule->ministry)) {
            abort(403, 'Forbidden.');
        }

        if ($validated['available'] && $schedule->schedule_date && $profile->isUnavailableOnDate($schedule->schedule_date)) {
            throw ValidationException::withMessages([
                'available' => [$profile->isPaused()
                    ? 'Suas escalas estão pausadas. Retome no seu perfil para participar.'
                    : 'Você marcou esta data como indisponível. Atualize sua disponibilidade primeiro.'],
            ]);
        }

        // Once on the team, backing out must go through a substitute request so the
        // leaders hear about it; silently flipping the answer would leave a gap.
        if ($schedule->members()->where('profile_id', $profile->id)->exists()) {
            throw ValidationException::withMessages([
                'available' => ['Você já está nesta escala. Para sair, use "Solicitar troca" na escala.'],
            ]);
        }

        ScheduleAvailabilityResponse::query()->updateOrCreate(
            ['schedule_id' => $schedule->id, 'profile_id' => $profile->id],
            ['available' => $validated['available']],
        );

        return response()->json(['available' => $validated['available']]);
    }

    /**
     * Call status plus every answer, for the leader assigning functions.
     */
    public function responses(Request $request, Schedule $schedule): JsonResponse
    {
        $this->ensureCanManage($request, $schedule);

        $responses = $schedule->availabilityResponses()
            ->with(['profile:id,name,avatar_url', 'profile.instruments:id,profile_id,instrument', 'profile.voices:id,profile_id,voice_type'])
            ->orderByDesc('available')
            ->orderBy('updated_at')
            ->get();

        $scheduledProfileIds = $schedule->members()->pluck('profile_id')->all();

        return response()->json([
            ...$this->formatCall($schedule),
            'responses' => $responses->map(fn (ScheduleAvailabilityResponse $response) => [
                'id' => $response->id,
                'available' => $response->available,
                'responded_at' => $response->updated_at?->toISOString(),
                'is_scheduled' => in_array($response->profile_id, $scheduledProfileIds, true),
                'profile' => $response->profile ? [
                    'id' => $response->profile->id,
                    'name' => $response->profile->name,
                    'avatar_url' => $response->profile->avatar_url,
                    'instruments' => $response->profile->instruments->pluck('instrument')->values()->all(),
                    'voices' => $response->profile->voices->pluck('voice_type')->values()->all(),
                ] : null,
            ])->values(),
        ]);
    }

    private function notifyPool(User $sender, Schedule $schedule): void
    {
        $scheduleDate = optional($schedule->schedule_date)->format('d/m/Y');
        $label = $schedule->title ?: 'Culto';

        $userIds = MinistryAccess::scopePool(Profile::query(), $schedule->ministry)
            ->where('is_approved', true)
            ->where('is_active', true)
            ->whereNull('paused_at')
            ->where('user_id', '!=', $sender->id)
            ->whereDoesntHave('user.roles', fn (Builder $roles) => $roles->where('role', 'admin'))
            ->pluck('user_id');

        foreach ($userIds as $userId) {
            AppNotification::query()->create([
                'user_id' => $userId,
                'schedule_id' => $schedule->id,
                'title' => 'Quem pode participar?',
                'message' => $scheduleDate
                    ? "{$label} em {$scheduleDate}: confirme se pode participar."
                    : "{$label}: confirme se pode participar.",
                'type' => 'availability_call',
            ]);
        }
    }

    private function formatCall(Schedule $schedule): array
    {
        return [
            'schedule_id' => $schedule->id,
            'is_open' => $schedule->isCallOpen(),
            'opened_at' => $schedule->call_opened_at?->toISOString(),
            'closed_at' => $schedule->call_closed_at?->toISOString(),
            'deadline' => $schedule->call_deadline?->toISOString(),
        ];
    }

    private function ensureCanManage(Request $request, Schedule $schedule): void
    {
        if (! MinistryAccess::canManage($request->user(), $schedule->ministry)) {
            abort(403, 'Forbidden.');
        }
    }
}
