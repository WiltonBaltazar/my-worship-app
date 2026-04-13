<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
        });

        // Drop the single-column token — new table handles all sessions.
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['api_token']);
            $table->dropColumn('api_token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');

        Schema::table('users', function (Blueprint $table): void {
            $table->string('api_token', 64)->nullable()->unique()->after('remember_token');
        });
    }
};
