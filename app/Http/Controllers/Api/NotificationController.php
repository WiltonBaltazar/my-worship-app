<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $this->visibleNotificationsQuery($request)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($notifications);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = $this->visibleNotificationsQuery($request)
            ->where('read', false)
            ->count();

        return response()->json([
            'count' => $count,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
            'type' => ['nullable', 'string', 'max:50'],
            'schedule_id' => ['nullable', 'exists:schedules,id'],
        ]);

        if ($validated['user_id'] !== $request->user()->id && ! $request->user()->isAdmin() && ! $request->user()->isLeader()) {
            abort(403, 'Forbidden.');
        }

        $notification = AppNotification::query()->create([
            ...$validated,
            'type' => $validated['type'] ?? 'announcement',
        ]);

        return response()->json($notification, 201);
    }

    public function markRead(Request $request, AppNotification $notification): JsonResponse
    {
        $this->ensureOwnership($request, $notification);

        $notification->update(['read' => true]);

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('read', false)
            ->update(['read' => true]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function destroy(Request $request, AppNotification $notification): JsonResponse
    {
        $this->ensureOwnership($request, $notification);

        $notification->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }

    private function ensureOwnership(Request $request, AppNotification $notification): void
    {
        if ($notification->user_id !== $request->user()->id && ! $request->user()->isAdmin()) {
            abort(403, 'Forbidden.');
        }
    }

    private function visibleNotificationsQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = AppNotification::query()->where('user_id', $user->id);

        if ($user->created_at !== null) {
            $query->where('created_at', '>=', $user->created_at->copy()->startOfDay());
        }

        return $query;
    }
}
