<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('technical_schedules', function (Blueprint $table): void {
            $table
                ->string('schedule_type', 20)
                ->default('public_worship')
                ->after('week_start_date');
        });

        DB::table('technical_schedules')
            ->whereNull('schedule_type')
            ->update(['schedule_type' => 'public_worship']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('technical_schedules', function (Blueprint $table): void {
            $table->dropColumn('schedule_type');
        });
    }
};

