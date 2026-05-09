<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TechsphereClass extends Model
{
    protected $table = 'techsphere_classes';

    protected $fillable = [
        'name', 'description', 'capacity', 'venue', 'status',
        'zoom_meeting_id', 'zoom_join_url', 'zoom_start_url', 'zoom_password',
    ];

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(Teacher::class, 'techsphere_class_teacher');
    }

    public function enrolledUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'techsphere_class_user');
    }
}
