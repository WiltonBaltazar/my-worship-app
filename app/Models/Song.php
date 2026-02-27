<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Song extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'title',
        'artist',
        'chords_url',
        'lyrics_url',
        'lyrics',
        'video_url',
        'spotify_url',
        'apple_music_url',
        'tags',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scheduleSongs(): HasMany
    {
        return $this->hasMany(ScheduleSong::class);
    }
}
