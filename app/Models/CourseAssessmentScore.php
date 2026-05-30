<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseAssessmentScore extends Model
{
    protected $fillable = ['assessment_id', 'user_id', 'score'];

    protected $casts = ['score' => 'decimal:2'];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(CourseAssessment::class, 'assessment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
