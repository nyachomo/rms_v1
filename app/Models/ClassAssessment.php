<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\TechsphereClass;
use App\Models\Course;
use App\Models\CourseModule;

class ClassAssessment extends Model
{
    protected $fillable = [
        'title',
        'description',
        'techsphere_class_id',
        'course_id',
        'module_id',
        'due_date',
        'assessment_file_path',
        'assessment_file_name',
        'status',
        'created_by',
    ];

    protected $casts = [
        'due_date' => 'datetime',
    ];

    public function techsphereClass(): BelongsTo
    {
        return $this->belongsTo(TechsphereClass::class, 'techsphere_class_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(CourseModule::class, 'module_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(ClassAssessmentSubmission::class, 'assessment_id');
    }
}
