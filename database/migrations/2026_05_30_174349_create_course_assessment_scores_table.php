<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_assessment_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('course_assessments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('score', 8, 2);
            $table->timestamps();

            $table->unique(['assessment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_assessment_scores');
    }
};
