<?php

namespace App\Observers;

use App\Models\AppNotification;
use App\Models\Schedule;
use App\Models\UserRole;

class ScheduleObserver
{
    public function updated(Schedule $schedule): void
    {
        if (! $schedule->wasChanged('status') || $schedule->status !== 'published') {
            return;
        }

        $scheduleDate = optional($schedule->schedule_date)->format('d/m/Y');
        $message = $scheduleDate
            ? "Você foi adicionado(a) à escala de {$scheduleDate}."
            : 'Você foi adicionado(a) a uma nova escala.';

        $adminUserIds = UserRole::query()
            ->where('role', 'admin')
            ->pluck('user_id')
            ->all();

        $members = $schedule->members()
            ->with('profile:id,user_id')
            ->get();

        foreach ($members as $member) {
            $userId = $member->profile?->user_id;

            if (! $userId || in_array($userId, $adminUserIds, true)) {
                continue;
            }

            AppNotification::query()->create([
                'user_id' => $userId,
                'schedule_id' => $schedule->id,
                'title' => 'Nova escala para você',
                'message' => $message,
                'type' => 'schedule',
            ]);
        }
    }
}
