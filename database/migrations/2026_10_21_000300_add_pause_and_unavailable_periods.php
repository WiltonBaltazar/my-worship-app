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
        // A paused member is left out of every schedule until they resume.
        Schema::table('profiles', function (Blueprint $table): void {
            $table->timestamp('paused_at')->nullable()->after('is_approved');
        });

        Schema::create('profile_unavailable_periods', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('profile_id')->constrained('profiles')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->timestampsTz();

            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('profile_unavailable_periods');

        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropColumn('paused_at');
        });
    }
};
