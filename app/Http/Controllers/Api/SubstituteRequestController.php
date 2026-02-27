<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\ScheduleMember;
use App\Models\SubstituteRequest;
use App\Models\UserRole;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubstituteRequestController extends Controller
{
    public function myRequests(Request $request): JsonResponse
    {
        $profile = $this->currentProfile($request);

        if (! $profile) {
            return response()->json([]);
        }

        $requests = SubstituteRequest::query()
            ->where('candidate_profile_id', $profile->id)
            ->where('status', 'pending')
            ->with([
                'scheduleMember.profile:id,name,avatar_url,user_id',
                'scheduleMember.schedule:id,schedule_date,start_time,title',
                'candidateProfile:id,name,avatar_url',
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SubstituteRequest $substituteRequest) => $this->formatRequest($substituteRequest))
            ->values();

        return response()->json($requests);
    }

    public function pendingCount(Request $request): JsonResponse
    {
        $profile = $this->currentProfile($request);

        if (! $profile) {
            return response()->json(['count' => 0]);
        }

        $count = SubstituteRequest::query()
            ->where('candidate_profile_id', $profile->id)
            ->where('status', 'pending')
            ->count();

        return response()->json(['count' => $count]);
    }

    public function create(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'schedule_member_id' => ['required', 'exists:schedule_members,id'],
            'candidate_profile_ids' => ['nullable', 'array'],
            'candidate_profile_ids.*' => ['string', 'exists:profiles,id'],
        ]);

        $scheduleMember = ScheduleMember::query()
            ->with(['profile', 'schedule'])
            ->findOrFail($validated['schedule_member_id']);

        if ($scheduleMember->profile?->user_id !== $request->user()->id) {
            abort(403, 'You can only request substitute for your own schedule membership.');
        }

        $candidateProfileIds = collect($validated['candidate_profile_ids'] ?? [])->unique()->values();

        if ($candidateProfileIds->isNotEmpty()) {
            $adminCandidateCount = Profile::query()
                ->whereIn('id', $candidateProfileIds)
                ->whereHas('user.roles', fn ($query) => $query->where('role', 'admin'))
                ->count();

            if ($adminCandidateCount > 0) {
                throw ValidationException::withMessages([
                    'candidate_profile_ids' => ['Administradores não podem ser selecionados como substitutos.'],
                ]);
            }
        }

        DB::transaction(function () use ($scheduleMember, $candidateProfileIds, $request): void {
            $scheduleMember->update([
                'requested_change' => true,
            ]);

            if ($candidateProfileIds->isNotEmpty()) {
                foreach ($candidateProfileIds as $candidateProfileId) {
                    SubstituteRequest::query()->updateOrCreate([
                        'schedule_member_id' => $scheduleMember->id,
                        'candidate_profile_id' => $candidateProfileId,
                    ], [
                        'status' => 'pending',
                        'responded_at' => null,
                    ]);
                }

                $candidates = Profile::query()
                    ->whereIn('id', $candidateProfileIds)
                    ->get(['id', 'user_id']);

                foreach ($candidates as $candidate) {
                    AppNotification::query()->create([
                        'user_id' => $candidate->user_id,
                        'schedule_id' => $scheduleMember->schedule_id,
                        'title' => 'Solicitação de troca',
                        'message' => $request->user()->name . ' pediu para você substituí-lo(a).',
                        'type' => 'substitute_request',
                    ]);
                }
            } else {
                $leadershipUserIds = UserRole::query()
                    ->whereIn('role', ['admin', 'leader'])
                    ->pluck('user_id');

                foreach ($leadershipUserIds as $leadershipUserId) {
                    if ($leadershipUserId === $request->user()->id) {
                        continue;
                    }

                    AppNotification::query()->create([
                        'user_id' => $leadershipUserId,
                        'schedule_id' => $scheduleMember->schedule_id,
                        'title' => 'Solicitação de troca pendente',
                        'message' => $request->user()->name . ' solicitou troca e precisa de um substituto.',
                        'type' => 'change_request',
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Substitute request created.',
        ], 201);
    }

    public function cancelByMember(Request $request, string $scheduleMemberId): JsonResponse
    {
        $scheduleMember = ScheduleMember::query()
            ->with('profile')
            ->findOrFail($scheduleMemberId);

        if ($scheduleMember->profile?->user_id !== $request->user()->id) {
            abort(403, 'Forbidden.');
        }

        DB::transaction(function () use ($scheduleMember): void {
            SubstituteRequest::query()
                ->where('schedule_member_id', $scheduleMember->id)
                ->where('status', 'pending')
                ->delete();

            $scheduleMember->update([
                'requested_change' => false,
                'change_reason' => null,
                'suggested_substitute_id' => null,
            ]);
        });

        return response()->json([
            'message' => 'Substitute request canceled.',
        ]);
    }

    public function accept(Request $request, SubstituteRequest $substituteRequest): JsonResponse
    {
        $profile = $this->currentProfileOrFail($request);

        if ($substituteRequest->candidate_profile_id !== $profile->id) {
            abort(403, 'Forbidden.');
        }

        if ($substituteRequest->status !== 'pending') {
            return response()->json(['message' => 'Request is no longer pending.'], 422);
        }

        $substituteRequest->load([
            'scheduleMember.profile',
            'scheduleMember.schedule',
            'candidateProfile',
        ]);

        $scheduleMember = $substituteRequest->scheduleMember;

        if (! $scheduleMember) {
            return response()->json(['message' => 'Schedule member not found.'], 404);
        }

        $profile->loadMissing('unavailableDates');
        $schedule = $scheduleMember->schedule;

        if ($schedule && $profile->isUnavailableOnDate($schedule->schedule_date)) {
            $formattedDate = optional($schedule->schedule_date)->format('d/m/Y');

            throw ValidationException::withMessages([
                'candidate_profile_id' => [
                    "{$profile->name} está indisponível em {$formattedDate}.",
                ],
            ]);
        }

        DB::transaction(function () use ($substituteRequest, $scheduleMember, $profile): void {
            $now = Carbon::now();

            $substituteRequest->update([
                'status' => 'accepted',
                'responded_at' => $now,
            ]);

            SubstituteRequest::query()
                ->where('schedule_member_id', $scheduleMember->id)
                ->where('status', 'pending')
                ->where('id', '!=', $substituteRequest->id)
                ->update([
                    'status' => 'rejected',
                    'responded_at' => $now,
                ]);

            $originalProfile = $scheduleMember->profile;
            $scheduleId = $scheduleMember->schedule_id;
            $functionType = $scheduleMember->function_type;
            $functionDetail = $scheduleMember->function_detail;

            $scheduleMember->delete();

            ScheduleMember::query()->create([
                'schedule_id' => $scheduleId,
                'profile_id' => $profile->id,
                'function_type' => $functionType,
                'function_detail' => $functionDetail,
                'confirmed' => true,
            ]);

            if ($originalProfile) {
                AppNotification::query()->create([
                    'user_id' => $originalProfile->user_id,
                    'schedule_id' => $scheduleId,
                    'title' => 'Substituição aceita!',
                    'message' => $profile->name . ' aceitou substituí-lo(a).',
                    'type' => 'confirmation',
                ]);
            }
        });

        return response()->json([
            'message' => 'Substitute request accepted.',
        ]);
    }

    public function reject(Request $request, SubstituteRequest $substituteRequest): JsonResponse
    {
        $profile = $this->currentProfileOrFail($request);

        if ($substituteRequest->candidate_profile_id !== $profile->id) {
            abort(403, 'Forbidden.');
        }

        if ($substituteRequest->status !== 'pending') {
            return response()->json(['message' => 'Request is no longer pending.'], 422);
        }

        $substituteRequest->load('scheduleMember.profile');

        $substituteRequest->update([
            'status' => 'rejected',
            'responded_at' => Carbon::now(),
        ]);

        $requesterUserId = $substituteRequest->scheduleMember?->profile?->user_id;

        if ($requesterUserId) {
            AppNotification::query()->create([
                'user_id' => $requesterUserId,
                'schedule_id' => $substituteRequest->scheduleMember->schedule_id,
                'title' => 'Substituto recusou',
                'message' => $profile->name . ' não pode substituir você nesta escala.',
                'type' => 'schedule',
            ]);
        }

        return response()->json([
            'message' => 'Substitute request rejected.',
        ]);
    }

    private function formatRequest(SubstituteRequest $request): array
    {
        return [
            'id' => $request->id,
            'schedule_member_id' => $request->schedule_member_id,
            'candidate_profile_id' => $request->candidate_profile_id,
            'status' => $request->status,
            'created_at' => optional($request->created_at)?->toISOString(),
            'responded_at' => optional($request->responded_at)?->toISOString(),
            'schedule_member' => $request->scheduleMember ? [
                'id' => $request->scheduleMember->id,
                'schedule_id' => $request->scheduleMember->schedule_id,
                'profile_id' => $request->scheduleMember->profile_id,
                'function_type' => $request->scheduleMember->function_type,
                'function_detail' => $request->scheduleMember->function_detail,
                'profile' => $request->scheduleMember->profile ? [
                    'id' => $request->scheduleMember->profile->id,
                    'name' => $request->scheduleMember->profile->name,
                    'avatar_url' => $request->scheduleMember->profile->avatar_url,
                    'user_id' => $request->scheduleMember->profile->user_id,
                ] : null,
                'schedule' => $request->scheduleMember->schedule ? [
                    'id' => $request->scheduleMember->schedule->id,
                    'schedule_date' => optional($request->scheduleMember->schedule->schedule_date)->format('Y-m-d'),
                    'start_time' => $request->scheduleMember->schedule->start_time,
                    'title' => $request->scheduleMember->schedule->title,
                ] : null,
            ] : null,
            'candidate_profile' => $request->candidateProfile ? [
                'id' => $request->candidateProfile->id,
                'name' => $request->candidateProfile->name,
                'avatar_url' => $request->candidateProfile->avatar_url,
            ] : null,
        ];
    }

    private function currentProfile(Request $request): ?Profile
    {
        return Profile::query()
            ->where('user_id', $request->user()->id)
            ->first();
    }

    private function currentProfileOrFail(Request $request): Profile
    {
        return Profile::query()
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
    }
}
