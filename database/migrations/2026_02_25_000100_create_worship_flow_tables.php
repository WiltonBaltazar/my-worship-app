<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('avatar_url')->nullable();
            $table->string('phone')->nullable();
            $table->boolean('can_lead')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_approved')->default(false);
            $table->timestampsTz();
        });

        Schema::create('user_roles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['admin', 'leader', 'member'])->default('member');
            $table->unique(['user_id', 'role']);
        });

        Schema::create('member_instruments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('profile_id')->constrained('profiles')->cascadeOnDelete();
            $table->enum('instrument', [
                'guitar',
                'bass',
                'drums',
                'keyboard',
                'acoustic_guitar',
                'violin',
                'percussion',
                'other',
                'sound_tech',
            ]);
            $table->unique(['profile_id', 'instrument']);
        });

        Schema::create('member_voices', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('profile_id')->constrained('profiles')->cascadeOnDelete();
            $table->enum('voice_type', ['soprano', 'alto', 'tenor', 'bass_voice', 'lead']);
            $table->unique(['profile_id', 'voice_type']);
        });

        Schema::create('songs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('artist')->nullable();
            $table->string('music_key')->nullable();
            $table->unsignedInteger('tempo')->nullable();
            $table->string('chords_url')->nullable();
            $table->string('lyrics_url')->nullable();
            $table->longText('lyrics')->nullable();
            $table->string('video_url')->nullable();
            $table->string('spotify_url')->nullable();
            $table->string('apple_music_url')->nullable();
            $table->json('tags')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });

        Schema::create('schedules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->date('schedule_date');
            $table->time('start_time')->default('11:00:00');
            $table->enum('status', ['draft', 'published', 'confirmed'])->default('draft');
            $table->enum('schedule_type', ['worship', 'rehearsal'])->default('worship');
            $table->string('title')->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });

        Schema::create('schedule_members', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('schedule_id')->constrained('schedules')->cascadeOnDelete();
            $table->foreignUuid('profile_id')->constrained('profiles')->cascadeOnDelete();
            $table->enum('function_type', ['lead_vocal', 'backing_vocal', 'instrumentalist', 'sound_tech']);
            $table->string('function_detail')->nullable();
            $table->boolean('confirmed')->default(false);
            $table->boolean('requested_change')->default(false);
            $table->text('change_reason')->nullable();
            $table->foreignUuid('suggested_substitute_id')->nullable()->constrained('profiles')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['schedule_id', 'profile_id']);
        });

        Schema::create('schedule_songs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('schedule_id')->constrained('schedules')->cascadeOnDelete();
            $table->foreignUuid('song_id')->constrained('songs')->cascadeOnDelete();
            $table->unsignedInteger('order_position')->default(0);
            $table->text('notes')->nullable();
            $table->unique(['schedule_id', 'song_id']);
        });

        Schema::create('notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('schedule_id')->nullable()->constrained('schedules')->nullOnDelete();
            $table->string('title');
            $table->text('message');
            $table->string('type')->default('announcement');
            $table->boolean('read')->default(false);
            $table->timestampTz('created_at')->useCurrent();
            $table->index('type');
            $table->index('schedule_id');
        });

        Schema::create('substitute_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('schedule_member_id')->constrained('schedule_members')->cascadeOnDelete();
            $table->foreignUuid('candidate_profile_id')->constrained('profiles')->cascadeOnDelete();
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('responded_at')->nullable();
            $table->unique(['schedule_member_id', 'candidate_profile_id'], 'sub_req_member_candidate_uq');
        });

        Schema::create('push_subscriptions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('endpoint');
            $table->char('endpoint_hash', 64);
            $table->text('p256dh');
            $table->text('auth');
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['user_id', 'endpoint_hash'], 'push_sub_user_endpointhash_uq');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
        Schema::dropIfExists('substitute_requests');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('schedule_songs');
        Schema::dropIfExists('schedule_members');
        Schema::dropIfExists('schedules');
        Schema::dropIfExists('songs');
        Schema::dropIfExists('member_voices');
        Schema::dropIfExists('member_instruments');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('profiles');
    }
};
