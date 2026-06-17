<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeePayment extends Model
{
    protected $fillable = [
        'enrollment_id',
        'amount_paid',
        'date_paid',
        'payment_ref_no',
        'payment_method',
    ];

    protected $casts = [
        'date_paid'   => 'date',
        'amount_paid' => 'decimal:2',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }
}
