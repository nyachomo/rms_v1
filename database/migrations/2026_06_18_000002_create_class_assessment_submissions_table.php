<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_assessment_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('class_assessments')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->string('submission_file_path')->nullable();
            $table->string('submission_file_name')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->enum('status', ['pending', 'submitted', 'graded'])->default('pending');
            $table->string('grade')->nullable();
            $table->text('feedback')->nullable();
            $table->string('marked_file_path')->nullable();
            $table->string('marked_file_name')->nullable();
            $table->unsignedBigInteger('marked_by')->nullable();
            $table->foreign('marked_by')->references('id')->on('users')->nullOnDelete();
            $table->timestamp('marked_at')->nullable();
            $table->timestamps();

            $table->unique(['assessment_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_assessment_submissions');
    }
};
