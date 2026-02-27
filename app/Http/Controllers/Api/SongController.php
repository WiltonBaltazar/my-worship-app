<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Song;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SongController extends Controller
{
    public function index(): JsonResponse
    {
        $songs = Song::query()
            ->orderBy('title')
            ->get();

        return response()->json($songs);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'artist' => ['nullable', 'string', 'max:255'],
            'chords_url' => ['nullable', 'url'],
            'lyrics_url' => ['nullable', 'url'],
            'lyrics' => ['nullable', 'string'],
            'video_url' => ['nullable', 'url'],
            'spotify_url' => ['nullable', 'url'],
            'apple_music_url' => ['nullable', 'url'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
        ]);

        $song = Song::query()->create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($song, 201);
    }

    public function update(Request $request, Song $song): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'artist' => ['nullable', 'string', 'max:255'],
            'chords_url' => ['nullable', 'url'],
            'lyrics_url' => ['nullable', 'url'],
            'lyrics' => ['nullable', 'string'],
            'video_url' => ['nullable', 'url'],
            'spotify_url' => ['nullable', 'url'],
            'apple_music_url' => ['nullable', 'url'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
        ]);

        $song->update($validated);

        return response()->json($song->fresh());
    }

    public function destroy(Request $request, Song $song): JsonResponse
    {
        $this->ensureLeaderAccess($request);

        $song->delete();

        return response()->json(['message' => 'Song deleted.']);
    }

    private function ensureLeaderAccess(Request $request): void
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isLeader()) {
            abort(403, 'Forbidden.');
        }
    }
}
