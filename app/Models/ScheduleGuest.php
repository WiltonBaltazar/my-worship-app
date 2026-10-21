<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A special presentation on a schedule (a song, poem, sermon...), made by an outside
 * guest or by a registered member (profile_id).
 */
class ScheduleGuest extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'schedule_id',
        'profile_id',
        'name',
        'role',
        'song_title',
        'song_url',
        'notes',
        'order_position',
    ];

    protected function casts(): array
    {
        return [
            'order_position' => 'integer',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    /**
     * Set when the presenter is a registered member rather than an outside guest.
     */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }
}
