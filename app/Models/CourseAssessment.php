<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseAssessment extends Model
{
    protected $fillable = ['course_id', 'name', 'max_score', 'sort_order'];

    protected $casts = ['max_score' => 'decimal:2'];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function scores(): HasMany
    {
        return $this->hasMany(CourseAssessmentScore::class, 'assessment_id');
    }
}
