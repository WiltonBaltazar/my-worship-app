<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('member_instruments')
            ->where('instrument', 'sound_tech')
            ->delete();

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE member_instruments MODIFY instrument ENUM('guitar', 'bass', 'drums', 'keyboard', 'acoustic_guitar', 'violin', 'percussion', 'other') NOT NULL",
            );

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE member_instruments DROP CONSTRAINT IF EXISTS member_instruments_instrument_check');
            DB::statement(
                "ALTER TABLE member_instruments ADD CONSTRAINT member_instruments_instrument_check CHECK (instrument IN ('guitar', 'bass', 'drums', 'keyboard', 'acoustic_guitar', 'violin', 'percussion', 'other'))",
            );
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE member_instruments MODIFY instrument ENUM('guitar', 'bass', 'drums', 'keyboard', 'acoustic_guitar', 'violin', 'percussion', 'other', 'sound_tech') NOT NULL",
            );

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE member_instruments DROP CONSTRAINT IF EXISTS member_instruments_instrument_check');
            DB::statement(
                "ALTER TABLE member_instruments ADD CONSTRAINT member_instruments_instrument_check CHECK (instrument IN ('guitar', 'bass', 'drums', 'keyboard', 'acoustic_guitar', 'violin', 'percussion', 'other', 'sound_tech'))",
            );
        }
    }
};
