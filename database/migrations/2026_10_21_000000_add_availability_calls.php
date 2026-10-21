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
        Schema::table('schedules', function (Blueprint $table): void {
            $table->timestamp('call_opened_at')->nullable()->after('notes');
            $table->timestamp('call_closed_at')->nullable()->after('call_opened_at');
            $table->timestamp('call_deadline')->nullable()->after('call_closed_at');
        });

        Schema::create('schedule_availability_responses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('schedule_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('profile_id')->constrained()->cascadeOnDelete();
            $table->boolean('available');
            $table->timestamps();

            $table->unique(['schedule_id', 'profile_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_availability_responses');

        Schema::table('schedules', function (Blueprint $table): void {
            $table->dropColumn(['call_opened_at', 'call_closed_at', 'call_deadline']);
        });
    }
};
