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
        Schema::create('techsphere_class_teacher', function (Blueprint $table) {
            $table->foreignId('techsphere_class_id')->constrained('techsphere_classes')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
            $table->primary(['techsphere_class_id', 'teacher_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('techsphere_class_teacher');
    }
};
