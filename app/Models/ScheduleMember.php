<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleMember extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'schedule_id',
        'profile_id',
        'function_type',
        'function_detail',
        'confirmed',
        'can_edit',
        'requested_change',
        'change_reason',
        'suggested_substitute_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'confirmed' => 'boolean',
            'can_edit' => 'boolean',
            'requested_change' => 'boolean',
            'created_at' => 'datetime',
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

    public function suggestedSubstitute(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'suggested_substitute_id');
    }

    public function substituteRequests(): HasMany
    {
        return $this->hasMany(SubstituteRequest::class);
    }
}
