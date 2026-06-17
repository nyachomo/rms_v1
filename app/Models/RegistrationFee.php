<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationFee extends Model
{
    protected $fillable = [
        'user_id',
        'amount_paid',
        'date_paid',
        'payment_ref_no',
        'payment_method',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'date_paid'   => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
