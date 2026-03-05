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
        Schema::create('technical_schedules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->date('week_start_date')->unique();
            $table->foreignUuid('lead_profile_id')->nullable()->constrained('profiles')->nullOnDelete();
            $table->foreignUuid('sound_profile_id')->nullable()->constrained('profiles')->nullOnDelete();
            $table->foreignUuid('streaming_profile_id')->nullable()->constrained('profiles')->nullOnDelete();
            $table->boolean('is_locked')->default(false);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('technical_schedules');
    }
};
