<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE user_roles MODIFY role ENUM('admin', 'leader', 'member', 'sound_tech') NOT NULL DEFAULT 'member'");
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check");
            DB::statement("ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'leader', 'member', 'sound_tech'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE user_roles MODIFY role ENUM('admin', 'leader', 'member') NOT NULL DEFAULT 'member'");
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check");
            DB::statement("ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'leader', 'member'))");
        }
    }
};
