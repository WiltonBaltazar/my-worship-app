<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TechnicalSchedule extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'week_start_date',
        'schedule_type',
        'lead_profile_id',
        'sound_profile_id',
        'streaming_profile_id',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'week_start_date' => 'date',
        ];
    }

    public function leadProfile(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'lead_profile_id');
    }

    public function soundProfile(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'sound_profile_id');
    }

    public function streamingProfile(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'streaming_profile_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
