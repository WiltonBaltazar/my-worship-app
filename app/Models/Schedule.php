<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Schedule extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $attributes = [
        'ministry' => 'dms',
    ];

    protected $fillable = [
        'schedule_date',
        'start_time',
        'status',
        'schedule_type',
        'ministry',
        'title',
        'notes',
        'created_by',
        'call_opened_at',
        'call_closed_at',
        'call_deadline',
    ];

    protected function casts(): array
    {
        return [
            'schedule_date' => 'date',
            'call_opened_at' => 'datetime',
            'call_closed_at' => 'datetime',
            'call_deadline' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): HasMany
    {
        return $this->hasMany(ScheduleMember::class);
    }

    public function songs(): HasMany
    {
        return $this->hasMany(ScheduleSong::class);
    }

    public function guests(): HasMany
    {
        return $this->hasMany(ScheduleGuest::class)->orderBy('order_position');
    }

    public function availabilityResponses(): HasMany
    {
        return $this->hasMany(ScheduleAvailabilityResponse::class);
    }

    public function isCallOpen(): bool
    {
        return $this->call_opened_at !== null
            && $this->call_closed_at === null
            && ($this->call_deadline === null || $this->call_deadline->isFuture());
    }

    /**
     * Schedules whose availability call is currently accepting responses.
     */
    public function scopeWithOpenCall(Builder $query): Builder
    {
        return $query->whereNotNull('call_opened_at')
            ->whereNull('call_closed_at')
            ->where(fn (Builder $deadline) => $deadline->whereNull('call_deadline')->orWhere('call_deadline', '>', now()));
    }
}
