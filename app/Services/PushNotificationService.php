<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\PushSubscription;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushNotificationService
{
    public function sendForNotification(AppNotification $notification): void
    {
        $vapidPublicKey = (string) config('webpush.vapid.public_key');
        $vapidPrivateKey = (string) config('webpush.vapid.private_key');
        $vapidSubject = (string) config('webpush.vapid.subject');

        if ($vapidPublicKey === '' || $vapidPrivateKey === '' || $vapidSubject === '') {
            return;
        }

        $subscriptions = PushSubscription::query()
            ->where('user_id', $notification->user_id)
            ->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => $vapidSubject,
                'publicKey' => $vapidPublicKey,
                'privateKey' => $vapidPrivateKey,
            ],
        ]);

        $payload = json_encode([
            'id' => $notification->id,
            'title' => $notification->title,
            'message' => $notification->message,
            'type' => $notification->type,
            'schedule_id' => $notification->schedule_id,
            'url' => $this->resolveNotificationUrl($notification),
        ], JSON_THROW_ON_ERROR);

        foreach ($subscriptions as $subscription) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'keys' => [
                        'p256dh' => $subscription->p256dh,
                        'auth' => $subscription->auth,
                    ],
                ]),
                $payload,
            );
        }

        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                continue;
            }

            if ($report->isSubscriptionExpired()) {
                PushSubscription::query()
                    ->where('endpoint', $report->getEndpoint())
                    ->delete();
            }

            Log::warning('Failed to send web push notification.', [
                'notification_id' => $notification->id,
                'endpoint' => $report->getEndpoint(),
                'reason' => $report->getReason(),
            ]);
        }
    }

    private function resolveNotificationUrl(AppNotification $notification): string
    {
        if ($notification->type === 'approval_request') {
            return '/admin-app/users';
        }

        if ($notification->type === 'change_request' && $notification->schedule_id) {
            return '/admin-app/schedules/' . $notification->schedule_id;
        }

        if (
            $notification->type === 'schedule'
            && $notification->schedule_id
            && $notification->title !== 'Removido da escala'
        ) {
            return '/schedules/' . $notification->schedule_id;
        }

        return '/notifications';
    }
}
