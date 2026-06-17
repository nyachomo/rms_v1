<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Enrollment extends Model
{
    protected $fillable = [
        'course_id', 'intake_id', 'user_id',
        'school_level_id', 'class_id', 'school_id',
        'name', 'email', 'phone',
        'sponsorship',
        'sponsor_name', 'sponsor_email', 'sponsor_phone',
        'status', 'course_fee',
    ];

    protected $casts = [
        'course_fee' => 'decimal:2',
    ];

    public function course(): BelongsTo       { return $this->belongsTo(Course::class); }
    public function intake(): BelongsTo       { return $this->belongsTo(Intake::class); }
    public function user(): BelongsTo         { return $this->belongsTo(User::class); }
    public function schoolLevel(): BelongsTo  { return $this->belongsTo(SchoolLevel::class); }
    public function schoolClass(): BelongsTo  { return $this->belongsTo(SchoolClass::class, 'class_id'); }
    public function school(): BelongsTo       { return $this->belongsTo(School::class); }
    public function feePayments(): HasMany    { return $this->hasMany(FeePayment::class); }
}
