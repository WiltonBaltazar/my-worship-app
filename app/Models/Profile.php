<?php

namespace App\Models;

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
        'can_lead',
        'can_be_tech_lead',
        'can_be_tech_sound',
        'can_be_tech_streaming',
        'is_active',
        'is_approved',
    ];

    protected function casts(): array
    {
        return [
            'can_lead' => 'boolean',
            'can_be_tech_lead' => 'boolean',
            'can_be_tech_sound' => 'boolean',
            'can_be_tech_streaming' => 'boolean',
            'is_active' => 'boolean',
            'is_approved' => 'boolean',
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

    public function isUnavailableOnDate(string|\DateTimeInterface $date): bool
    {
        $dateString = Carbon::parse($date)->format('Y-m-d');

        return $this->unavailableDates()
            ->whereDate('unavailable_date', $dateString)
            ->exists();
    }
}
