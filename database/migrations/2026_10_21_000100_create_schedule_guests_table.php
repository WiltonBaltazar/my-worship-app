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
        Schema::create('schedule_guests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('schedule_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('role', 100);
            $table->string('song_title')->nullable();
            $table->string('song_url', 2048)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedInteger('order_position')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_guests');
    }
};
