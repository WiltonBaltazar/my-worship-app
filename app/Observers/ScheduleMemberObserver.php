<?php

namespace App\Observers;

use App\Models\AppNotification;
use App\Models\ScheduleMember;
use App\Models\UserRole;

class ScheduleMemberObserver
{
    public function created(ScheduleMember $member): void
    {
        $schedule = $member->schedule()->first(['id', 'status', 'schedule_date']);

        if (! $schedule || ! in_array($schedule->status, ['published', 'confirmed'], true)) {
            return;
        }

        $userId = $member->profile()->value('user_id');

        if (! $userId) {
            return;
        }

        $isAdmin = UserRole::query()
            ->where('user_id', $userId)
            ->where('role', 'admin')
            ->exists();

        if ($isAdmin) {
            return;
        }

        $scheduleDate = optional($schedule->schedule_date)->format('d/m/Y');
        $message = $scheduleDate
            ? "Você foi adicionado(a) à escala de {$scheduleDate}."
            : 'Você foi adicionado(a) a uma nova escala.';

        AppNotification::query()->create([
            'user_id' => $userId,
            'schedule_id' => $schedule->id,
            'title' => 'Nova escala para você',
            'message' => $message,
            'type' => 'schedule',
        ]);
    }
}
