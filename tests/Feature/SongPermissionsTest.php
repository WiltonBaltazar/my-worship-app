<?php

namespace Tests\Feature;

use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SongPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_member_can_create_song(): void
    {
        $member = User::factory()->create();
        $member->profile()->firstOrFail()->update([
            'is_approved' => true,
            'is_active' => true,
        ]);

        $response = $this->postJson(
            '/api/songs',
            [
                'title' => 'Nova Música da Equipe',
                'artist' => 'Ministério de Teste',
            ],
            $this->authHeadersFor($member),
        );

        $response
            ->assertCreated()
            ->assertJsonPath('title', 'Nova Música da Equipe');

        $this->assertDatabaseHas('songs', [
            'title' => 'Nova Música da Equipe',
            'created_by' => $member->id,
        ]);
    }

    public function test_regular_member_can_update_song(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();

        $song = Song::query()->create([
            'title' => 'Música Original',
            'created_by' => $admin->id,
        ]);

        $response = $this->patchJson(
            "/api/songs/{$song->id}",
            [
                'title' => 'Música Alterada',
            ],
            $this->authHeadersFor($member),
        );

        $response
            ->assertOk()
            ->assertJsonPath('title', 'Música Alterada');

        $this->assertDatabaseHas('songs', [
            'id' => $song->id,
            'title' => 'Música Alterada',
        ]);
    }

    private function authHeadersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . $user->issueApiToken(),
            'Accept' => 'application/json',
        ];
    }
}
