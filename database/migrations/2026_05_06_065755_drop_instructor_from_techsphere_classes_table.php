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
        Schema::table('techsphere_classes', function (Blueprint $table) {
            $table->dropColumn('instructor');
        });
    }

    public function down(): void
    {
        Schema::table('techsphere_classes', function (Blueprint $table) {
            $table->string('instructor', 200)->nullable()->after('capacity');
        });
    }
};
