<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Use raw SQL: MySQL requires disabling FK checks to drop indexes linked to columns
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::statement('ALTER TABLE class_assessment_submissions DROP INDEX class_assessment_submissions_assessment_id_student_id_unique');
        DB::statement('ALTER TABLE class_assessment_submissions DROP INDEX class_assessment_submissions_student_id_foreign');
        DB::statement('ALTER TABLE class_assessment_submissions DROP COLUMN student_id');
        DB::statement('ALTER TABLE class_assessment_submissions ADD COLUMN user_id BIGINT UNSIGNED NOT NULL AFTER assessment_id');
        DB::statement('ALTER TABLE class_assessment_submissions ADD CONSTRAINT class_assessment_submissions_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE class_assessment_submissions ADD UNIQUE KEY class_assessment_submissions_assessment_id_user_id_unique (assessment_id, user_id)');
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::table('class_assessment_submissions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropUnique(['assessment_id', 'user_id']);
            $table->dropColumn('user_id');

            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->unique(['assessment_id', 'student_id']);
        });
    }
};
