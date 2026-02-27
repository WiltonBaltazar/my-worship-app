<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SongController;
use App\Http\Controllers\Api\SubstituteRequestController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/setup/needs-initial', [AuthController::class, 'needsInitialSetup']);

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::middleware('auth.token')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/me', [AuthController::class, 'updateProfile']);
        Route::patch('/password', [AuthController::class, 'updatePassword']);
    });

    Route::get('/profiles', [ProfileController::class, 'index']);
    Route::get('/profiles/pending-count', [ProfileController::class, 'pendingCount']);
    Route::patch('/profiles/{profile}', [ProfileController::class, 'update']);
    Route::delete('/profiles/{profile}', [ProfileController::class, 'destroy']);

    Route::get('/songs', [SongController::class, 'index']);
    Route::post('/songs', [SongController::class, 'store']);
    Route::patch('/songs/{song}', [SongController::class, 'update']);
    Route::delete('/songs/{song}', [SongController::class, 'destroy']);

    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::get('/schedules/me', [ScheduleController::class, 'mySchedules']);
    Route::post('/schedules', [ScheduleController::class, 'create']);
    Route::patch('/schedules/{schedule}', [ScheduleController::class, 'update']);
    Route::delete('/schedules/{schedule}', [ScheduleController::class, 'destroy']);
    Route::post('/schedules/{schedule}/members', [ScheduleController::class, 'addMember']);
    Route::patch('/schedule-members/{member}', [ScheduleController::class, 'updateMember']);
    Route::delete('/schedule-members/{member}', [ScheduleController::class, 'removeMember']);
    Route::post('/schedules/{schedule}/songs', [ScheduleController::class, 'syncSongs']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    Route::get('/push-subscriptions/vapid-public-key', [PushSubscriptionController::class, 'vapidPublicKey']);
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store']);
    Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy']);

    Route::get('/substitute-requests/my', [SubstituteRequestController::class, 'myRequests']);
    Route::get('/substitute-requests/pending-count', [SubstituteRequestController::class, 'pendingCount']);
    Route::post('/substitute-requests', [SubstituteRequestController::class, 'create']);
    Route::delete('/substitute-requests/member/{scheduleMemberId}', [SubstituteRequestController::class, 'cancelByMember']);
    Route::post('/substitute-requests/{substituteRequest}/accept', [SubstituteRequestController::class, 'accept']);
    Route::post('/substitute-requests/{substituteRequest}/reject', [SubstituteRequestController::class, 'reject']);
});
