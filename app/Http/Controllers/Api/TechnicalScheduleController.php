<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\TechnicalSchedule;
use App\Services\TechnicalSchedule\ConstraintValidator;
use App\Services\TechnicalSchedule\FairnessCalculator;
use App\Services\TechnicalSchedule\ScheduleOptimizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class TechnicalScheduleController extends Controller
{
    private const SCHEDULE_TYPE_PUBLIC_WORSHIP = 'public_worship';
    private const SCHEDULE_TYPE_GHJ = 'ghj';
    private const HOME_GROUP_GHJ = 'GHJ';

    public function __construct(
        private readonly ScheduleOptimizer $scheduleOptimizer,
        private readonly ConstraintValidator $constraintValidator,
        private readonly FairnessCalculator $fairnessCalculator,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureTechnicalManagementAccess($request);

        $validated = Validator::make($request->query(), [
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'weeks' => ['nullable', 'integer', 'min:1', 'max:24'],
        ])->validate();

        $startDate = Carbon::parse($validated['start_date'] ?? now()->format('Y-m-d'));
        $weeks = isset($validated['weeks']) ? (int) $validated['weeks'] : null;

        $query = TechnicalSchedule::query()
            ->orderBy('week_start_date')
            ->with([
                'leadProfile:id,name,avatar_url',
                'soundProfile:id,name,avatar_url',
                'streamingProfile:id,name,avatar_url',
            ]);

        if ($weeks !== null) {
            $endDate = $startDate->copy()->addWeeks($weeks - 1)->format('Y-m-d');
            $query
                ->whereDate('week_start_date', '>=', $startDate->format('Y-m-d'))
                ->whereDate('week_start_date', '<=', $endDate);
        } else {
            $query->whereDate('week_start_date', '>=', $startDate->format('Y-m-d'));
        }

        $schedules = $query->get();
        $technicians = $this->eligibleTechnicians();
        $loadByTechnician = $this->buildLoadByTechnician($schedules, $technicians);

        return response()->json([
            'weeks' => $schedules
                ->map(fn (TechnicalSchedule $schedule): array => $this->formatScheduleWeek($schedule))
                ->values()
                ->all(),
            'technicians' => array_values($technicians),
            'fairness_score' => $this->fairnessCalculator->getFairnessScore($loadByTechnician),
        ]);
    }

    public function generate(Request $request): JsonResponse
    {
        $this->ensureTechnicalManagementAccess($request);

        $validated = $request->validate([
            'start_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'weeks' => ['required', 'integer', 'min:1', 'max:24'],
            'simulate' => ['nullable', 'boolean'],
            'schedule_type' => ['nullable', 'in:' . self::SCHEDULE_TYPE_PUBLIC_WORSHIP . ',' . self::SCHEDULE_TYPE_GHJ],
            'max_fairness_gap' => ['nullable', 'integer', 'min:0', 'max:20'],
        ]);

        $startDate = Carbon::parse($validated['start_date']);
        $weeks = (int) $validated['weeks'];
        $simulate = (bool) ($validated['simulate'] ?? true);
        $scheduleType = $validated['schedule_type'] ?? self::SCHEDULE_TYPE_PUBLIC_WORSHIP;
        $requiresStreaming = $scheduleType !== self::SCHEDULE_TYPE_GHJ;
        $homeGroupFilter = $scheduleType === self::SCHEDULE_TYPE_GHJ ? self::HOME_GROUP_GHJ : null;
        $maxFairnessGap = isset($validated['max_fairness_gap']) ? (int) $validated['max_fairness_gap'] : null;

        $weekDates = collect(range(0, $weeks - 1))
            ->map(fn (int $offset): string => $startDate->copy()->addWeeks($offset)->format('Y-m-d'))
            ->values()
            ->all();

        $existingSchedules = TechnicalSchedule::query()
            ->whereIn('week_start_date', $weekDates)
            ->orderBy('week_start_date')
            ->get()
            ->keyBy(fn (TechnicalSchedule $schedule): string => $schedule->week_start_date->format('Y-m-d'));

        try {
            $result = $this->scheduleOptimizer->optimize(
                $weekDates,
                $maxFairnessGap,
                $requiresStreaming,
                $homeGroupFilter,
                $scheduleType,
            );
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'weeks' => [$exception->getMessage()],
            ]);
        }

        if (! $simulate) {
            foreach ($result['assignments_by_date'] as $weekDate => $assignment) {
                $existing = $existingSchedules[$weekDate] ?? null;

                $schedule = $existing ?? new TechnicalSchedule([
                    'week_start_date' => $weekDate,
                    'created_by' => $request->user()->id,
                ]);

                $schedule->lead_profile_id = $assignment['lead'];
                $schedule->sound_profile_id = $assignment['sound'];
                $schedule->streaming_profile_id = $assignment['streaming'] ?? null;
                $schedule->schedule_type = $scheduleType;
                $schedule->updated_by = $request->user()->id;
                $schedule->save();
            }
        }

        if ($simulate) {
            $weeksPayload = collect($result['assignments_by_date'])
                ->map(function (array $assignment, string $weekDate) use ($result): array {
                    return $this->formatGeneratedWeek(
                        $weekDate,
                        $assignment,
                        $result['technicians'],
                        $result['schedule_type'] ?? self::SCHEDULE_TYPE_PUBLIC_WORSHIP,
                    );
                })
                ->values()
                ->all();
        } else {
            $persistedSchedules = TechnicalSchedule::query()
                ->whereIn('week_start_date', $weekDates)
                ->orderBy('week_start_date')
                ->with([
                    'leadProfile:id,name,avatar_url',
                    'soundProfile:id,name,avatar_url',
                    'streamingProfile:id,name,avatar_url',
                ])
                ->get();

            $weeksPayload = $persistedSchedules
                ->map(fn (TechnicalSchedule $schedule): array => $this->formatScheduleWeek($schedule))
                ->values()
                ->all();
        }

        return response()->json([
            'simulated' => $simulate,
            'schedule_type' => $scheduleType,
            'weeks' => $weeksPayload,
            'fairness_score' => $result['fairness_score'],
            'lead_coverage_deficit_score' => $result['lead_coverage_deficit_score'] ?? $result['monthly_lead_deficit_score'] ?? 0,
            'lead_sequence_deviation_score' => $result['lead_sequence_deviation_score'] ?? 0,
            'monthly_lead_deficit_score' => $result['monthly_lead_deficit_score'] ?? 0,
            'role_repetition_score' => $result['role_repetition_score'],
            'load_by_technician' => $result['load_by_technician'],
        ]);
    }

    public function update(Request $request, TechnicalSchedule $technicalSchedule): JsonResponse
    {
        $this->ensureTechnicalManagementAccess($request);

        $validated = $request->validate([
            'lead_profile_id' => ['nullable', 'exists:profiles,id'],
            'sound_profile_id' => ['nullable', 'exists:profiles,id'],
            'streaming_profile_id' => ['nullable', 'exists:profiles,id'],
        ]);

        $requiresStreaming = $technicalSchedule->schedule_type !== self::SCHEDULE_TYPE_GHJ;
        $requiredRoles = $this->constraintValidator->requiredRoles($requiresStreaming);
        $homeGroupFilter = $technicalSchedule->schedule_type === self::SCHEDULE_TYPE_GHJ ? self::HOME_GROUP_GHJ : null;

        $nextAssignment = [
            'lead' => array_key_exists('lead_profile_id', $validated) ? $validated['lead_profile_id'] : $technicalSchedule->lead_profile_id,
            'sound' => array_key_exists('sound_profile_id', $validated) ? $validated['sound_profile_id'] : $technicalSchedule->sound_profile_id,
            'streaming' => $requiresStreaming
                ? (array_key_exists('streaming_profile_id', $validated) ? $validated['streaming_profile_id'] : $technicalSchedule->streaming_profile_id)
                : null,
        ];

        $technicians = $this->eligibleTechnicians($homeGroupFilter);

        if (! $this->constraintValidator->hasDistinctRoles($nextAssignment, $requiredRoles)) {
            $rolesLabel = $requiresStreaming ? 'lead, sound e streaming' : 'lead e sound';
            throw ValidationException::withMessages([
                'week' => ["As funções {$rolesLabel} devem ser atribuídas a pessoas diferentes."],
            ]);
        }

        foreach ($requiredRoles as $role) {
            $technicianId = $nextAssignment[$role];

            if (! $technicianId) {
                continue;
            }

            if (! isset($technicians[$technicianId])) {
                throw ValidationException::withMessages([
                    $role . '_profile_id' => ['Técnico inválido para escala técnica.'],
                ]);
            }

            if (! $this->constraintValidator->isTechnicianEligibleForRole($technicianId, $role, $technicians)) {
                throw ValidationException::withMessages([
                    $role . '_profile_id' => ['Técnico sem permissão para essa função.'],
                ]);
            }

            if ($homeGroupFilter !== null && ($technicians[$technicianId]['home_group'] ?? null) !== $homeGroupFilter) {
                throw ValidationException::withMessages([
                    $role . '_profile_id' => ['Para escala GHJ, o técnico deve pertencer ao GHJ.'],
                ]);
            }
        }

        $technicalSchedule->update([
            'lead_profile_id' => $nextAssignment['lead'],
            'sound_profile_id' => $nextAssignment['sound'],
            'streaming_profile_id' => $nextAssignment['streaming'],
            'updated_by' => $request->user()->id,
        ]);

        $technicalSchedule->load([
            'leadProfile:id,name,avatar_url',
            'soundProfile:id,name,avatar_url',
            'streamingProfile:id,name,avatar_url',
        ]);

        return response()->json($this->formatScheduleWeek($technicalSchedule));
    }

    public function destroy(Request $request, TechnicalSchedule $technicalSchedule): JsonResponse
    {
        $this->ensureTechnicalManagementAccess($request);

        $technicalSchedule->delete();

        return response()->json([
            'message' => 'Semana técnica removida com sucesso.',
        ]);
    }

    /**
     * @return array<string, array{id:string,name:string,avatar_url:?string,home_group:?string,can_be_tech_lead:bool,can_be_tech_sound:bool,can_be_tech_streaming:bool}>
     */
    private function eligibleTechnicians(?string $homeGroupFilter = null): array
    {
        $query = Profile::query()
            ->with('user.roles:user_id,role')
            ->where('is_active', true)
            ->where('is_approved', true)
            ->where(function ($query): void {
                $query
                    ->where('can_be_tech_lead', true)
                    ->orWhere('can_be_tech_sound', true)
                    ->orWhere('can_be_tech_streaming', true);
            })
            ->orderBy('name');

        if ($homeGroupFilter !== null) {
            $query->where('home_group', $homeGroupFilter);
        }

        return $query
            ->get()
            ->reject(
                fn (Profile $profile): bool => (bool) $profile->user?->roles?->contains('role', 'admin'),
            )
            ->mapWithKeys(fn (Profile $profile): array => [
                $profile->id => [
                    'id' => $profile->id,
                    'name' => $profile->name,
                    'avatar_url' => $profile->avatar_url,
                    'home_group' => $profile->home_group,
                    'can_be_tech_lead' => (bool) $profile->can_be_tech_lead,
                    'can_be_tech_sound' => (bool) $profile->can_be_tech_sound,
                    'can_be_tech_streaming' => (bool) $profile->can_be_tech_streaming,
                ],
            ])
            ->all();
    }

    /**
     * @param  array<string, array{id:string,name:string,avatar_url:?string,home_group:?string}>  $technicians
     * @param  array{lead:?string,sound:?string,streaming:?string}  $assignment
     */
    private function formatGeneratedWeek(
        string $weekDate,
        array $assignment,
        array $technicians,
        string $scheduleType = self::SCHEDULE_TYPE_PUBLIC_WORSHIP,
    ): array {
        return [
            'id' => null,
            'week_start_date' => $weekDate,
            'schedule_type' => $scheduleType,
            'lead_profile_id' => $assignment['lead'],
            'sound_profile_id' => $assignment['sound'],
            'streaming_profile_id' => $assignment['streaming'] ?? null,
            'lead_profile' => $assignment['lead'] ? ($technicians[$assignment['lead']] ?? null) : null,
            'sound_profile' => $assignment['sound'] ? ($technicians[$assignment['sound']] ?? null) : null,
            'streaming_profile' => $assignment['streaming'] ? ($technicians[$assignment['streaming']] ?? null) : null,
        ];
    }

    private function formatScheduleWeek(TechnicalSchedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'week_start_date' => optional($schedule->week_start_date)->format('Y-m-d'),
            'schedule_type' => $schedule->schedule_type ?? self::SCHEDULE_TYPE_PUBLIC_WORSHIP,
            'lead_profile_id' => $schedule->lead_profile_id,
            'sound_profile_id' => $schedule->sound_profile_id,
            'streaming_profile_id' => $schedule->streaming_profile_id,
            'lead_profile' => $schedule->leadProfile ? [
                'id' => $schedule->leadProfile->id,
                'name' => $schedule->leadProfile->name,
                'avatar_url' => $schedule->leadProfile->avatar_url,
            ] : null,
            'sound_profile' => $schedule->soundProfile ? [
                'id' => $schedule->soundProfile->id,
                'name' => $schedule->soundProfile->name,
                'avatar_url' => $schedule->soundProfile->avatar_url,
            ] : null,
            'streaming_profile' => $schedule->streamingProfile ? [
                'id' => $schedule->streamingProfile->id,
                'name' => $schedule->streamingProfile->name,
                'avatar_url' => $schedule->streamingProfile->avatar_url,
            ] : null,
            'created_at' => optional($schedule->created_at)?->toISOString(),
            'updated_at' => optional($schedule->updated_at)?->toISOString(),
        ];
    }

    private function ensureTechnicalManagementAccess(Request $request): void
    {
        $user = $request->user();

        if (! $user->isAdmin() && ! $user->isLeader() && ! $user->isSoundTech()) {
            abort(403, 'Forbidden.');
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TechnicalSchedule>  $schedules
     * @param  array<string, mixed>  $technicians
     * @return array<string, int>
     */
    private function buildLoadByTechnician($schedules, array $technicians): array
    {
        $loadByTechnician = [];

        foreach (array_keys($technicians) as $technicianId) {
            $loadByTechnician[$technicianId] = 0;
        }

        foreach ($schedules as $schedule) {
            foreach (ConstraintValidator::ROLES as $role) {
                $column = $role . '_profile_id';
                $technicianId = $schedule->{$column};

                if (! $technicianId || ! isset($loadByTechnician[$technicianId])) {
                    continue;
                }

                $loadByTechnician[$technicianId]++;
            }
        }

        return $loadByTechnician;
    }

}
