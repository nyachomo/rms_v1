<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassAssessment extends Model
{
    protected $fillable = [
        'title',
        'description',
        'class_id',
        'due_date',
        'assessment_file_path',
        'assessment_file_name',
        'status',
        'created_by',
    ];

    protected $casts = [
        'due_date' => 'datetime',
    ];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
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
