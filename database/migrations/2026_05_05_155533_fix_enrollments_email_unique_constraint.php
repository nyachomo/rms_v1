<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            // Drop the over-restrictive single-column unique — it blocks
            // students from enrolling in more than one course
            $table->dropUnique('enrollments_email_unique');

            // Allow the same email across courses, but not the same
            // (email + course) twice
            $table->unique(['email', 'course_id'], 'enrollments_email_course_unique');
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropUnique('enrollments_email_course_unique');
            $table->unique('email', 'enrollments_email_unique');
        });
    }
};
