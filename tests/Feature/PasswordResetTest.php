<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_reset_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'member@example.com',
        ]);

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'member@example.com',
        ])->assertOk()
            ->assertJsonPath('message', 'Se o e-mail existir, enviaremos um link de redefinição.');

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_updates_user_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'member@example.com',
            'password' => 'old-password',
        ]);

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'member@example.com',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk()
            ->assertJsonPath('message', 'Senha redefinida com sucesso.');

        $user->refresh();

        $this->assertTrue(Hash::check('new-password', $user->password));

        $this->postJson('/api/auth/login', [
            'email' => 'member@example.com',
            'password' => 'new-password',
        ])->assertOk();
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        User::factory()->create([
            'email' => 'member@example.com',
        ]);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'invalid-token',
            'email' => 'member@example.com',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['token']);
    }
}
