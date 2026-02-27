<?php

namespace App\Observers;

use App\Models\AppNotification;
use App\Services\PushNotificationService;
use Illuminate\Support\Facades\Log;

class AppNotificationObserver
{
    public function __construct(
        private readonly PushNotificationService $pushNotificationService,
    ) {
    }

    public function created(AppNotification $notification): void
    {
        try {
            $this->pushNotificationService->sendForNotification($notification);
        } catch (\Throwable $exception) {
            Log::warning('Web push dispatch failed.', [
                'notification_id' => $notification->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
