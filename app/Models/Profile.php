<?php

namespace App\Models;

use App\Support\MinistryAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Profile extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'avatar_url',
        'phone',
        'home_group',
        'in_dms',
        'leads_dms',
        'leads_ghj',
        'can_lead',
        'can_be_tech_lead',
        'can_be_tech_sound',
        'can_be_tech_streaming',
        'is_active',
        'is_approved',
        'paused_at',
        'paused_ministry',
    ];

    protected function casts(): array
    {
        return [
            'in_dms' => 'boolean',
            'leads_dms' => 'boolean',
            'leads_ghj' => 'boolean',
            'can_lead' => 'boolean',
            'can_be_tech_lead' => 'boolean',
            'can_be_tech_sound' => 'boolean',
            'can_be_tech_streaming' => 'boolean',
            'is_active' => 'boolean',
            'is_approved' => 'boolean',
            'paused_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function instruments(): HasMany
    {
        return $this->hasMany(MemberInstrument::class);
    }

    public function voices(): HasMany
    {
        return $this->hasMany(MemberVoice::class);
    }

    public function scheduleMemberships(): HasMany
    {
        return $this->hasMany(ScheduleMember::class);
    }

    public function unavailableDates(): HasMany
    {
        return $this->hasMany(ProfileUnavailableDate::class);
    }

    public function unavailablePeriods(): HasMany
    {
        return $this->hasMany(ProfileUnavailablePeriod::class)->orderBy('start_date');
    }

    /**
     * Paused for the given ministry. Without one, only a pause covering every ministry counts.
     */
    public function isPaused(?string $ministry = null): bool
    {
        if ($this->paused_at === null) {
            return false;
        }

        return $this->paused_ministry === null || ($ministry !== null && $this->paused_ministry === $ministry);
    }

    /**
     * Ministries the member paused (every ministry when the pause has no ministry).
     *
     * @return list<string>
     */
    public function pausedMinistries(): array
    {
        if ($this->paused_at === null) {
            return [];
        }

        return $this->paused_ministry === null ? MinistryAccess::ALL : [$this->paused_ministry];
    }

    /**
     * Profiles not paused for the given ministry (without one: not paused for every ministry).
     */
    public function scopeNotPausedFor(Builder $query, ?string $ministry = null): Builder
    {
        return $query->where(function (Builder $pauseQuery) use ($ministry): void {
            $pauseQuery->whereNull('paused_at')
                ->orWhere(function (Builder $scopedPause) use ($ministry): void {
                    $scopedPause->whereNotNull('paused_ministry');

                    if ($ministry !== null) {
                        $scopedPause->where('paused_ministry', '!=', $ministry);
                    }
                });
        });
    }

    /**
     * Restricts absence rows to those that apply to the ministry (rows without one apply everywhere).
     */
    public static function scopeAbsencesTo(Builder|HasMany $absences, ?string $ministry): Builder|HasMany
    {
        return $absences->where(function (Builder $query) use ($ministry): void {
            $query->whereNull('ministry');

            if ($ministry !== null) {
                $query->orWhere('ministry', $ministry);
            }
        });
    }

    /**
     * Paused, or the date is marked unavailable on its own or inside a period, for the given
     * ministry. Without a ministry, only absences covering every ministry count.
     */
    public function isUnavailableOnDate(string|\DateTimeInterface $date, ?string $ministry = null): bool
    {
        if ($this->isPaused($ministry)) {
            return true;
        }

        $dateString = Carbon::parse($date)->format('Y-m-d');

        return self::scopeAbsencesTo($this->unavailableDates(), $ministry)
            ->whereDate('unavailable_date', $dateString)
            ->exists()
            || self::scopeAbsencesTo($this->unavailablePeriods(), $ministry)
                ->whereDate('start_date', '<=', $dateString)
                ->whereDate('end_date', '>=', $dateString)
                ->exists();
    }
}
