<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('parent_name', 200)->nullable()->after('parent_phone');
            $table->string('parent_email', 200)->nullable()->after('parent_name');
            $table->string('parent_relationship', 50)->nullable()->after('parent_email');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['parent_name', 'parent_email', 'parent_relationship']);
        });
    }
};
