<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('techsphere_classes', function (Blueprint $table) {
            $table->string('zoom_meeting_id', 50)->nullable()->after('status');
            $table->string('zoom_join_url')->nullable()->after('zoom_meeting_id');
            $table->text('zoom_start_url')->nullable()->after('zoom_join_url');
            $table->string('zoom_password', 50)->nullable()->after('zoom_start_url');
        });
    }

    public function down(): void
    {
        Schema::table('techsphere_classes', function (Blueprint $table) {
            $table->dropColumn(['zoom_meeting_id', 'zoom_join_url', 'zoom_start_url', 'zoom_password']);
        });
    }
};
