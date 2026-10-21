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
        // Special presentations can be made by a registered member, not only outside guests.
        Schema::table('schedule_guests', function (Blueprint $table): void {
            $table->foreignUuid('profile_id')->nullable()->after('schedule_id')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedule_guests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('profile_id');
        });
    }
};
