<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Course extends Model
{
    protected $fillable = [
        'slug', 'category', 'category_id', 'title', 'subtitle', 'description',
        'icon', 'icon_class', 'level', 'level_class', 'duration',
        'students_count', 'rating', 'reviews_count', 'price',
        'tags', 'image_url', 'overview', 'badge', 'sort_order', 'status',
    ];

    protected $casts = [
        'tags'   => 'array',
        'rating' => 'float',
    ];

    public function courseCategory(): BelongsTo
    {
        return $this->belongsTo(CourseCategory::class, 'category_id');
    }

    public function outcomes()
    {
        return $this->hasMany(CourseOutcome::class)->orderBy('sort_order');
    }

    public function curriculum()
    {
        return $this->hasMany(CourseCurriculum::class)->orderBy('sort_order');
    }

    public function instructors()
    {
        return $this->hasMany(CourseInstructor::class)->orderBy('sort_order');
    }

    public function lessons()
    {
        return $this->hasMany(CourseLesson::class)->orderBy('sort_order');
    }

    public function modules()
    {
        return $this->hasMany(CourseModule::class)->orderBy('sort_order');
    }

    public function assessments()
    {
        return $this->hasMany(CourseAssessment::class)->orderBy('sort_order');
    }
}
