<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_members', function (Blueprint $table): void {
            $table->boolean('can_edit')->default(false)->after('confirmed');
        });
    }

    public function down(): void
    {
        Schema::table('schedule_members', function (Blueprint $table): void {
            $table->dropColumn('can_edit');
        });
    }
};
