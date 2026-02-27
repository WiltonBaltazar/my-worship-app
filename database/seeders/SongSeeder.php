<?php

namespace Database\Seeders;

use App\Models\Song;
use Illuminate\Database\Seeder;

class SongSeeder extends Seeder
{
    public function run(): void
    {
        $songs = json_decode(
            file_get_contents(database_path('seeders/data/songs.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        foreach ($songs as $songData) {
            $tags = $songData['tags'] ?? [];

            if (is_string($tags)) {
                $decodedTags = json_decode($tags, true);
                $tags = is_array($decodedTags) ? $decodedTags : [];
            }

            Song::query()->updateOrCreate(
                [
                    'title' => $songData['title'],
                    'artist' => $songData['artist'] ?? null,
                ],
                [
                    'chords_url' => $songData['chords_url'] ?? null,
                    'lyrics_url' => $songData['lyrics_url'] ?? null,
                    'lyrics' => $songData['lyrics'] ?? null,
                    'video_url' => $songData['video_url'] ?? null,
                    'spotify_url' => $songData['spotify_url'] ?? null,
                    'apple_music_url' => $songData['apple_music_url'] ?? null,
                    'tags' => $tags,
                ],
            );
        }
    }
}
