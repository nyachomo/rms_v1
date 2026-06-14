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
        Schema::table('admission_letter_configs', function (Blueprint $table) {
            $table->string('director_signature')->nullable()->after('director_title');
        });
    }

    public function down(): void
    {
        Schema::table('admission_letter_configs', function (Blueprint $table) {
            $table->dropColumn('director_signature');
        });
    }
};
