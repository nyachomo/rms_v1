<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_assessments', function (Blueprint $table) {
            // Drop old school-class column
            $table->dropForeign(['class_id']);
            $table->dropColumn('class_id');

            // Add new columns
            $table->foreignId('techsphere_class_id')->nullable()->after('description')->constrained('techsphere_classes')->nullOnDelete();
            $table->foreignId('course_id')->nullable()->after('techsphere_class_id')->constrained('courses')->nullOnDelete();
            $table->foreignId('module_id')->nullable()->after('course_id')->constrained('course_modules')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('class_assessments', function (Blueprint $table) {
            $table->dropForeign(['techsphere_class_id']);
            $table->dropForeign(['course_id']);
            $table->dropForeign(['module_id']);
            $table->dropColumn(['techsphere_class_id', 'course_id', 'module_id']);

            $table->foreignId('class_id')->nullable()->constrained('school_classes')->nullOnDelete();
        });
    }
};
