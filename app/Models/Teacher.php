<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Teacher extends Model
{
    protected $fillable = [
        'user_id',
        'school_id',
        'name',
        'employee_number',
        'email',
        'phone',
        'gender',
        'address',
        'status',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function techsphereClasses(): BelongsToMany
    {
        return $this->belongsToMany(TechsphereClass::class, 'techsphere_class_teacher');
    }
}
