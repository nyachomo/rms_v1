<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admission_letter_configs', function (Blueprint $table) {
            $table->id();
            $table->string('institute_prefix', 20)->default('TTI');
            $table->date('orientation_date')->nullable();
            $table->string('orientation_time', 20)->nullable();
            $table->date('class_start_date')->nullable();
            $table->string('zoom_link', 500)->nullable();
            $table->string('meeting_id', 100)->nullable();
            $table->string('zoom_passcode', 100)->nullable();
            $table->string('schedule', 200)->nullable();
            $table->unsignedSmallInteger('duration_weeks')->nullable();
            $table->decimal('total_fee', 12, 2)->nullable();
            $table->string('first_installment_label', 100)->nullable();
            $table->decimal('first_installment_amount', 12, 2)->nullable();
            $table->string('second_installment_label', 100)->nullable();
            $table->decimal('second_installment_amount', 12, 2)->nullable();
            $table->string('third_installment_label', 100)->nullable();
            $table->decimal('third_installment_amount', 12, 2)->nullable();
            $table->string('monthly_fee_label', 100)->nullable();
            $table->decimal('monthly_fee_amount', 12, 2)->nullable();
            $table->string('mpesa_business_name', 200)->nullable();
            $table->string('mpesa_paybill', 100)->nullable();
            $table->string('mpesa_acc_no', 100)->nullable();
            $table->string('bank_name', 200)->nullable();
            $table->string('bank_acc_name', 200)->nullable();
            $table->string('bank_acc_no', 100)->nullable();
            $table->string('director_name', 200)->nullable();
            $table->string('director_title', 200)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_letter_configs');
    }
};
