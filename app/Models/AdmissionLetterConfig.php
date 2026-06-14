<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmissionLetterConfig extends Model
{
    protected $table = 'admission_letter_configs';

    protected $fillable = [
        'institute_prefix',
        'orientation_date', 'orientation_time',
        'class_start_date',
        'zoom_link', 'meeting_id', 'zoom_passcode',
        'schedule', 'duration_weeks',
        'total_fee',
        'first_installment_label',  'first_installment_amount',
        'second_installment_label', 'second_installment_amount',
        'third_installment_label',  'third_installment_amount',
        'monthly_fee_label',        'monthly_fee_amount',
        'mpesa_business_name', 'mpesa_paybill', 'mpesa_acc_no',
        'bank_name', 'bank_acc_name', 'bank_acc_no',
        'director_name', 'director_title', 'director_signature', 'show_director_name',
        'show_meeting_id', 'show_passcode',
    ];

    protected $casts = [
        'show_director_name' => 'boolean',
        'show_meeting_id'    => 'boolean',
        'show_passcode'      => 'boolean',
    ];

    public static function instance(): static
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
