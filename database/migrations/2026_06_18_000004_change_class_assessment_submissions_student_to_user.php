<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop FK constraint if it exists (some environments create it, others don't)
        $constraints = DB::select("
            SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'class_assessment_submissions'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
              AND CONSTRAINT_NAME = 'class_assessment_submissions_student_id_foreign'
        ");
        if (!empty($constraints)) {
            DB::statement('ALTER TABLE class_assessment_submissions DROP FOREIGN KEY class_assessment_submissions_student_id_foreign');
        }

        // Drop unique index if it exists
        $indexes = DB::select("
            SELECT INDEX_NAME FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'class_assessment_submissions'
              AND INDEX_NAME = 'class_assessment_submissions_assessment_id_student_id_unique'
            LIMIT 1
        ");
        if (!empty($indexes)) {
            DB::statement('ALTER TABLE class_assessment_submissions DROP INDEX class_assessment_submissions_assessment_id_student_id_unique');
        }

        // Drop the plain index if it exists
        $plainIndex = DB::select("
            SELECT INDEX_NAME FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'class_assessment_submissions'
              AND INDEX_NAME = 'class_assessment_submissions_student_id_foreign'
            LIMIT 1
        ");
        if (!empty($plainIndex)) {
            DB::statement('ALTER TABLE class_assessment_submissions DROP INDEX class_assessment_submissions_student_id_foreign');
        }

        // Drop student_id column if it still exists
        $cols = DB::select("
            SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'class_assessment_submissions'
              AND COLUMN_NAME = 'student_id'
        ");
        if (!empty($cols)) {
            DB::statement('ALTER TABLE class_assessment_submissions DROP COLUMN student_id');
        }

        // Add user_id column if it doesn't exist yet
        $userCol = DB::select("
            SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'class_assessment_submissions'
              AND COLUMN_NAME = 'user_id'
        ");
        if (empty($userCol)) {
            DB::statement('ALTER TABLE class_assessment_submissions ADD COLUMN user_id BIGINT UNSIGNED NOT NULL AFTER assessment_id');
            DB::statement('ALTER TABLE class_assessment_submissions ADD CONSTRAINT class_assessment_submissions_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
            DB::statement('ALTER TABLE class_assessment_submissions ADD UNIQUE KEY class_assessment_submissions_assessment_id_user_id_unique (assessment_id, user_id)');
        }
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
