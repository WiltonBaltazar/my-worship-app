<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, HasUuids, Notifiable;

    public $incrementing = false;

    protected $keyType = 'string';

    /** Number of days a token stays valid without any use. */
    public const TOKEN_TTL_DAYS = 90;

    /** Extend expiry when fewer than this many days remain. */
    public const TOKEN_RENEW_THRESHOLD_DAYS = 30;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'notification_preferences',
    ];

    public const DEFAULT_NOTIFICATION_PREFERENCES = [
        'push_enabled' => true,
        'announcement' => true,
        'change_request' => true,
        'approval_request' => true,
        'confirmation' => true,
        'substitute_request' => true,
        'schedule' => true,
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_preferences' => 'array',
        ];
    }

    /**
     * @return array<string, bool>
     */
    public function getEffectiveNotificationPreferences(): array
    {
        return array_merge(
            self::DEFAULT_NOTIFICATION_PREFERENCES,
            $this->notification_preferences ?? [],
        );
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    public function accessTokens(): HasMany
    {
        return $this->hasMany(PersonalAccessToken::class);
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()
            ->where('role', $role)
            ->exists();
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isLeader(): bool
    {
        return $this->hasRole('leader');
    }

    public function isSoundTech(): bool
    {
        return $this->hasRole('sound_tech');
    }

    /**
     * Create a new session token for this device and return the plain-text value.
     */
    public function issueApiToken(): string
    {
        $plainToken = Str::random(80);

        $this->accessTokens()->create([
            'token' => hash('sha256', $plainToken),
            'expires_at' => now()->addDays(self::TOKEN_TTL_DAYS),
            'created_at' => now(),
        ]);

        return $plainToken;
    }

    /**
     * Revoke a specific session token (logout from one device).
     */
    public function revokeApiToken(string $plainToken): void
    {
        $this->accessTokens()
            ->where('token', hash('sha256', $plainToken))
            ->delete();
    }

    /**
     * Revoke all session tokens for this user (e.g. after password reset).
     */
    public function revokeAllTokens(): void
    {
        $this->accessTokens()->delete();
    }
}
