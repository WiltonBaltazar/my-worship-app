<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleAvailabilityResponse extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'schedule_id',
        'profile_id',
        'available',
    ];

    protected function casts(): array
    {
        return [
            'available' => 'boolean',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }
}
