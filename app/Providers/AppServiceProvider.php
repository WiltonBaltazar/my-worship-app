<?php

namespace App\Providers;

use App\Models\AppNotification;
use App\Models\Profile;
use App\Models\Schedule;
use App\Models\ScheduleMember;
use App\Models\User;
use App\Models\UserRole;
use App\Observers\AppNotificationObserver;
use App\Observers\ScheduleMemberObserver;
use App\Observers\ScheduleObserver;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
            $email = urlencode($user->email);
            $encodedToken = urlencode($token);

            return "{$frontendUrl}/auth?mode=reset&token={$encodedToken}&email={$email}";
        });

        AppNotification::observe(AppNotificationObserver::class);
        Schedule::observe(ScheduleObserver::class);
        ScheduleMember::observe(ScheduleMemberObserver::class);

        User::created(function (User $user): void {
            DB::transaction(function () use ($user): void {
                $isFirstUser = User::query()->count() === 1;

                Profile::query()->firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'name' => $user->name,
                        'email' => $user->email,
                        'is_approved' => $isFirstUser,
                    ],
                );

                UserRole::query()->firstOrCreate(
                    ['user_id' => $user->id, 'role' => $isFirstUser ? 'admin' : 'member'],
                );

                if (! $isFirstUser) {
                    $leadershipUserIds = UserRole::query()
                        ->whereIn('role', ['admin', 'leader'])
                        ->where('user_id', '!=', $user->id)
                        ->distinct()
                        ->pluck('user_id');

                    foreach ($leadershipUserIds as $leadershipUserId) {
                        AppNotification::query()->create([
                            'user_id' => $leadershipUserId,
                            'title' => 'Nova solicitação de acesso',
                            'message' => $user->name . ' solicitou acesso ao sistema.',
                            'type' => 'approval_request',
                        ]);
                    }
                }
            });
        });
    }
}
