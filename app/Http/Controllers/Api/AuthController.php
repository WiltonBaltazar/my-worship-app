<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const INSTRUMENTS = [
        'guitar',
        'bass',
        'drums',
        'keyboard',
        'acoustic_guitar',
        'violin',
        'percussion',
        'other',
    ];

    private const VOICES = [
        'soprano',
        'alto',
        'tenor',
        'bass_voice',
        'lead',
    ];

    private const HOME_GROUPS = [
        'GHH',
        'GHS',
        'GHJ',
        'GHC',
    ];

    public function needsInitialSetup(): JsonResponse
    {
        return response()->json([
            'needs_initial_setup' => User::query()->count() === 0,
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $requiresApproval = User::query()->exists();

        $request->merge([
            'email' => Str::lower(trim((string) $request->input('email'))),
        ]);

        $homeGroupRules = ['nullable', 'string', Rule::in(self::HOME_GROUPS)];

        if ($requiresApproval) {
            $homeGroupRules = ['required', 'string', Rule::in(self::HOME_GROUPS)];
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'home_group' => $homeGroupRules,
            'can_lead' => ['sometimes', 'boolean'],
            'can_be_tech_sound' => ['sometimes', 'boolean'],
            'can_be_tech_streaming' => ['sometimes', 'boolean'],
            'instruments' => ['sometimes', 'array'],
            'instruments.*' => ['string', Rule::in(self::INSTRUMENTS)],
            'voices' => ['sometimes', 'array'],
            'voices.*' => ['string', Rule::in(self::VOICES)],
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $user->loadMissing(['profile', 'roles']);

        if ($user->profile) {
            $this->persistRequestedSkills($user->profile, $validated);
            $user->profile->refresh();
        }

        if (! $user->profile?->is_approved) {
            return response()->json([
                'requires_approval' => true,
                'profile_id' => $user->profile?->id,
                'message' => 'Account created. Awaiting admin approval.',
            ], 201);
        }

        $token = $user->issueApiToken();

        return response()->json([
            'requires_approval' => false,
            'token' => $token,
            ...$this->authPayload($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->merge([
            'email' => Str::lower(trim((string) $request->input('email'))),
        ]);

        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->whereRaw('lower(email) = ?', [$credentials['email']])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        $user->loadMissing(['profile', 'roles']);

        if (! $user->profile?->is_approved) {
            return response()->json([
                'message' => 'Your account is waiting for approval.',
            ], 403);
        }

        $token = $user->issueApiToken();

        return response()->json([
            'token' => $token,
            ...$this->authPayload($user),
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->merge([
            'email' => Str::lower(trim((string) $request->input('email'))),
        ]);

        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        Password::broker()->sendResetLink([
            'email' => $validated['email'],
        ]);

        return response()->json([
            'message' => 'Se o e-mail existir, enviaremos um link de redefinição.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->merge([
            'email' => Str::lower(trim((string) $request->input('email'))),
        ]);

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $status = Password::broker()->reset(
            $validated,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $user->revokeApiToken();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'token' => ['Token inválido ou expirado.'],
            ]);
        }

        return response()->json([
            'message' => 'Senha redefinida com sucesso.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->revokeApiToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->loadMissing(['profile', 'roles']);

        return response()->json($this->authPayload($user));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->loadMissing('profile');

        $request->merge([
            'email' => Str::lower(trim((string) $request->input('email'))),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        Profile::query()
            ->where('user_id', $user->id)
            ->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
            ]);

        $user->refresh()->loadMissing(['profile', 'roles']);

        return response()->json($this->authPayload($user));
    }

    public function updatePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user->update([
            'password' => $validated['password'],
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    private function authPayload(User $user): array
    {
        $user->loadMissing(['profile', 'roles']);

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'profile' => $user->profile,
            'roles' => $user->roles->pluck('role')->values()->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function persistRequestedSkills(Profile $profile, array $validated): void
    {
        DB::transaction(function () use ($profile, $validated): void {
            if (array_key_exists('can_lead', $validated)) {
                $profile->update([
                    'can_lead' => (bool) $validated['can_lead'],
                ]);
            }

            if (array_key_exists('home_group', $validated)) {
                $profile->update([
                    'home_group' => $validated['home_group'],
                ]);
            }

            if (array_key_exists('can_be_tech_sound', $validated)) {
                $profile->update([
                    'can_be_tech_sound' => (bool) $validated['can_be_tech_sound'],
                ]);
            }

            if (array_key_exists('can_be_tech_streaming', $validated)) {
                $profile->update([
                    'can_be_tech_streaming' => (bool) $validated['can_be_tech_streaming'],
                ]);
            }

            if (array_key_exists('instruments', $validated)) {
                $profile->instruments()->delete();

                $instruments = collect($validated['instruments'] ?? [])
                    ->unique()
                    ->values()
                    ->all();

                if ($instruments !== []) {
                    $profile->instruments()->createMany(
                        collect($instruments)
                            ->map(fn (string $instrument): array => ['instrument' => $instrument])
                            ->all(),
                    );
                }
            }

            if (array_key_exists('voices', $validated)) {
                $profile->voices()->delete();

                $voices = collect($validated['voices'] ?? [])
                    ->unique()
                    ->values()
                    ->all();

                if ($voices !== []) {
                    $profile->voices()->createMany(
                        collect($voices)
                            ->map(fn (string $voice): array => ['voice_type' => $voice])
                            ->all(),
                    );
                }
            }
        });
    }
}
