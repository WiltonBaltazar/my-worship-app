<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubstituteRequest extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'schedule_member_id',
        'candidate_profile_id',
        'status',
        'created_at',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function scheduleMember(): BelongsTo
    {
        return $this->belongsTo(ScheduleMember::class);
    }

    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'candidate_profile_id');
    }
}
