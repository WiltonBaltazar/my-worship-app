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
        Schema::table('profiles', function (Blueprint $table): void {
            $table->boolean('can_be_tech_lead')->default(false)->after('can_lead');
            $table->boolean('can_be_tech_sound')->default(false)->after('can_be_tech_lead');
            $table->boolean('can_be_tech_streaming')->default(false)->after('can_be_tech_sound');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropColumn([
                'can_be_tech_lead',
                'can_be_tech_sound',
                'can_be_tech_streaming',
            ]);
        });
    }
};
