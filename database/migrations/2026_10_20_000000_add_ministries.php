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
        Schema::table('profiles', function (Blueprint $table): void {
            $table->boolean('in_dms')->default(false)->after('home_group');
            $table->boolean('leads_dms')->default(false)->after('in_dms');
            $table->boolean('leads_ghj')->default(false)->after('leads_dms');
        });

        Schema::table('schedules', function (Blueprint $table): void {
            $table->string('ministry', 10)->default('dms')->after('schedule_type');
            $table->index('ministry');
        });

        $this->backfill();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table): void {
            $table->dropIndex(['ministry']);
            $table->dropColumn('ministry');
        });

        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropColumn(['in_dms', 'leads_dms', 'leads_ghj']);
        });
    }

    private function backfill(): void
    {
        $adminUserIds = DB::table('user_roles')->where('role', 'admin')->pluck('user_id');
        $leaderUserIds = DB::table('user_roles')
            ->where('role', 'leader')
            ->whereNotIn('user_id', $adminUserIds)
            ->pluck('user_id');

        // Leaders who were previously locked to GHJ by their own home group.
        $ghjLeaderUserIds = DB::table('profiles')
            ->whereIn('user_id', $leaderUserIds)
            ->where('home_group', 'GHJ')
            ->pluck('user_id');

        DB::table('profiles')
            ->whereIn('user_id', $ghjLeaderUserIds)
            ->update(['leads_ghj' => true]);

        DB::table('profiles')
            ->whereIn('user_id', $leaderUserIds)
            ->whereNotIn('user_id', $ghjLeaderUserIds)
            ->update(['leads_dms' => true]);

        DB::table('schedules')
            ->whereIn('created_by', $ghjLeaderUserIds)
            ->update(['ministry' => 'ghj']);

        DB::table('profiles')
            ->where('is_approved', true)
            ->where(fn ($query) => $query->whereNull('home_group')->orWhere('home_group', '!=', 'GHJ'))
            ->update(['in_dms' => true]);

        // GHJ youth already serving on DMS schedules stay on the DMS roster.
        $dmsServingProfileIds = DB::table('schedule_members')
            ->join('schedules', 'schedules.id', '=', 'schedule_members.schedule_id')
            ->where('schedules.ministry', 'dms')
            ->distinct()
            ->pluck('schedule_members.profile_id');

        DB::table('profiles')
            ->whereIn('id', $dmsServingProfileIds)
            ->update(['in_dms' => true]);
    }
};
