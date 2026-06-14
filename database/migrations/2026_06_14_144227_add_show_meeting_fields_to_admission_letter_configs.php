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
            $table->boolean('show_meeting_id')->default(true)->after('show_director_name');
            $table->boolean('show_passcode')->default(true)->after('show_meeting_id');
        });
    }

    public function down(): void
    {
        Schema::table('admission_letter_configs', function (Blueprint $table) {
            $table->dropColumn(['show_meeting_id', 'show_passcode']);
        });
    }
};
