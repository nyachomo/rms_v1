<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassAssessmentSubmission extends Model
{
    protected $fillable = [
        'assessment_id',
        'student_id',
        'submission_file_path',
        'submission_file_name',
        'submitted_at',
        'status',
        'grade',
        'feedback',
        'marked_file_path',
        'marked_file_name',
        'marked_by',
        'marked_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'marked_at'    => 'datetime',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(ClassAssessment::class, 'assessment_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function markedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by');
    }
}
