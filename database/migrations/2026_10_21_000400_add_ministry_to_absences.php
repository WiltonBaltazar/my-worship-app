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
        // A null ministry means the absence or pause applies to every ministry (and technical schedules).
        Schema::table('profile_unavailable_dates', function (Blueprint $table): void {
            $table->string('ministry', 10)->nullable()->after('unavailable_date');
        });

        Schema::table('profile_unavailable_periods', function (Blueprint $table): void {
            $table->string('ministry', 10)->nullable()->after('end_date');
        });

        Schema::table('profiles', function (Blueprint $table): void {
            $table->string('paused_ministry', 10)->nullable()->after('paused_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropColumn('paused_ministry');
        });

        Schema::table('profile_unavailable_periods', function (Blueprint $table): void {
            $table->dropColumn('ministry');
        });

        Schema::table('profile_unavailable_dates', function (Blueprint $table): void {
            $table->dropColumn('ministry');
        });
    }
};
