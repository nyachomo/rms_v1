<?php

namespace App\Http\Controllers;

use App\Models\AdmissionLetterConfig;
use App\Models\CompanySetting;
use App\Models\Enrollment;
use App\Models\FeePayment;
use App\Models\TechsphereClass;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class FeePaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Enrollment::query()
            ->with(['course:id,title', 'intake:id,intake_name'])
            ->withSum('feePayments', 'amount_paid');

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($w) use ($q) {
                $w->where('name',  'like', "%{$q}%")
                  ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $enrollments = $query->latest()->paginate($request->input('per_page', 20));

        $enrollments->getCollection()->transform(function ($e) {
            $debit  = (float) ($e->course_fee ?? 0);
            $credit = (float) ($e->fee_payments_sum_amount_paid ?? 0);
            $e->debit   = $debit;
            $e->credit  = $credit;
            $e->balance = $debit - $credit;
            return $e;
        });

        return response()->json($enrollments);
    }

    public function updateCourseFee(Request $request, Enrollment $enrollment): JsonResponse
    {
        $data = $request->validate([
            'course_fee' => 'required|numeric|min:0',
        ]);

        $enrollment->update($data);

        $credit  = (float) $enrollment->feePayments()->sum('amount_paid');
        $debit   = (float) $enrollment->course_fee;
        $balance = $debit - $credit;

        return response()->json([
            'enrollment' => $enrollment,
            'debit'      => $debit,
            'credit'     => $credit,
            'balance'    => $balance,
        ]);
    }

    public function payments(Enrollment $enrollment): JsonResponse
    {
        $payments = $enrollment->feePayments()->orderBy('date_paid')->get();
        $credit   = (float) $payments->sum('amount_paid');
        $debit    = (float) ($enrollment->course_fee ?? 0);

        return response()->json([
            'enrollment' => $enrollment->load('course:id,title', 'intake:id,intake_name'),
            'payments'   => $payments,
            'debit'      => $debit,
            'credit'     => $credit,
            'balance'    => $debit - $credit,
        ]);
    }

    public function store(Request $request, Enrollment $enrollment): JsonResponse
    {
        $data = $request->validate([
            'amount_paid'      => 'required|numeric|min:0.01',
            'date_paid'        => 'required|date',
            'payment_ref_no'   => 'nullable|string|max:100',
            'payment_method'   => 'required|string|max:50',
        ]);

        $payment = $enrollment->feePayments()->create($data);

        $credit  = (float) $enrollment->feePayments()->sum('amount_paid');
        $debit   = (float) ($enrollment->course_fee ?? 0);

        return response()->json([
            'payment' => $payment,
            'debit'   => $debit,
            'credit'  => $credit,
            'balance' => $debit - $credit,
        ], 201);
    }

    public function destroy(Enrollment $enrollment, FeePayment $payment): JsonResponse
    {
        if ($payment->enrollment_id !== $enrollment->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $payment->delete();

        $credit  = (float) $enrollment->feePayments()->sum('amount_paid');
        $debit   = (float) ($enrollment->course_fee ?? 0);

        return response()->json([
            'debit'   => $debit,
            'credit'  => $credit,
            'balance' => $debit - $credit,
        ]);
    }

    public function downloadReceipt(Enrollment $enrollment, FeePayment $payment)
    {
        if ($payment->enrollment_id !== $enrollment->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $enrollment->load(['course:id,title', 'intake:id,intake_name']);
        $allPayments = $enrollment->feePayments()->orderBy('date_paid')->get();
        $config      = AdmissionLetterConfig::firstOrCreate(['id' => 1]);
        $setting     = CompanySetting::query()->first();

        $institutionName = $setting?->company_name   ?? 'Techsphere Training Institute';
        $address         = $setting?->company_address ?? 'PO BOX 1334-00618, NAIROBI View Park Towers 17th Floor';
        $website         = 'https://www.techsphereinstitute.co.ke';
        $email           = $setting?->company_email   ?? 'Info@techsphereinstitute.ac.ke';
        $phone           = $setting?->company_phone   ?? '+254768919307';

        $logoPath = public_path('logo/Logo.jpeg');
        $logoData = file_exists($logoPath)
            ? 'data:image/jpeg;base64,' . base64_encode(file_get_contents($logoPath))
            : null;

        // Look up the techsphere class for this student
        $techsphereClass = null;
        if ($enrollment->user_id) {
            $techsphereClass = TechsphereClass::whereHas('enrolledUsers', function ($q) use ($enrollment) {
                $q->where('users.id', $enrollment->user_id);
            })->first();
        }

        $credit  = (float) $allPayments->sum('amount_paid');
        $debit   = (float) ($enrollment->course_fee ?? 0);
        $balance = $debit - $credit;

        $html = $this->buildReceiptHtml(
            $enrollment, $payment, $allPayments,
            $config, $institutionName, $address, $website, $email, $phone,
            $logoData, $balance, $techsphereClass
        );

        $pdf      = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $safeName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $enrollment->name);
        $filename = 'Receipt_' . ($payment->payment_ref_no ?? $payment->id) . '_' . $safeName . '.pdf';

        return $pdf->download($filename);
    }

    private function buildReceiptHtml(
        Enrollment $enrollment,
        FeePayment $payment,
        \Illuminate\Database\Eloquent\Collection $allPayments,
        AdmissionLetterConfig $config,
        string $institutionName,
        string $address,
        string $website,
        string $email,
        string $phone,
        ?string $logoData,
        float $balance,
        ?TechsphereClass $techsphereClass = null
    ): string {
        $logoHtml = $logoData
            ? "<img src=\"{$logoData}\" style=\"width:140px;height:140px;border-radius:50%;object-fit:cover;\" />"
            : "<div style=\"width:140px;height:140px;border-radius:50%;background:#081f4e;text-align:center;line-height:140px;\"><span style=\"color:#fff;font-size:56px;font-weight:800;\">T</span></div>";

        $receiptNo       = htmlspecialchars($payment->payment_ref_no ?? "#{$payment->id}");
        $datePaid        = Carbon::parse($payment->date_paid)->format('Y-m-d');
        $amountPaid      = number_format($payment->amount_paid, 0);
        $courseName      = htmlspecialchars($enrollment->course?->title ?? '—');
        $intakeName      = htmlspecialchars($enrollment->intake?->intake_name ?? '—');
        $studentName     = htmlspecialchars($enrollment->name);
        $tsClassName     = htmlspecialchars($techsphereClass?->name ?? 'NA');
        $balanceAmt      = number_format(abs($balance), 2);
        $balanceAt       = Carbon::parse($payment->created_at ?? now())->format('Y-m-d H:i:s');

        $mpesaBizName = htmlspecialchars($config->mpesa_business_name ?? 'Techsphere Institute');
        $mpesaPaybill = htmlspecialchars($config->mpesa_paybill       ?? '522533');
        $mpesaAccNo   = htmlspecialchars($config->mpesa_acc_no        ?? '7855887');
        $bankName     = htmlspecialchars($config->bank_name           ?? 'Kenya Commercial Bank');
        $bankAccName  = htmlspecialchars($config->bank_acc_name       ?? 'Techsphere Institute');
        $bankAccNo    = htmlspecialchars($config->bank_acc_no         ?? '1327338564');

        // Build payment rows
        $paymentRows = '';
        foreach ($allPayments as $idx => $p) {
            $bg  = ($idx % 2 === 0) ? '#f9f9f9' : '#ffffff';
            $pDate = Carbon::parse($p->date_paid)->format('Y-m-d');
            $pAmt  = number_format($p->amount_paid, 0);
            $pRef  = htmlspecialchars($p->payment_ref_no ?? '—');
            $pMethod = htmlspecialchars($p->payment_method);
            $paymentRows .= <<<HTML
<tr style="background:{$bg};">
    <td style="padding:8px;border:1px solid #ddd;text-align:center;">{$p->id}</td>
    <td style="padding:8px;border:1px solid #ddd;">{$pAmt}</td>
    <td style="padding:8px;border:1px solid #ddd;">{$pDate}</td>
    <td style="padding:8px;border:1px solid #ddd;">{$pMethod}</td>
    <td style="padding:8px;border:1px solid #ddd;">{$pRef}</td>
</tr>
HTML;
        }

        $balanceLabel = $balance >= 0 ? 'Balance' : 'Overpayment';
        $balanceColor = $balance > 0 ? '#e53e3e' : '#38a169';

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size:12px; color:#222; padding:30px; }
    .header-table { width:100%; margin-bottom:16px; }
    .paid-banner { font-size:32px; font-weight:800; color:#2d6a4f; letter-spacing:2px; }
    .receipt-divider { border-top:2px solid #081f4e; margin:10px 0; }
    .section-label { font-weight:700; font-size:11px; color:#666; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
    .info-block { font-size:12px; line-height:1.7; }
    .inst-name { font-size:14px; font-weight:800; color:#e53e3e; letter-spacing:0.5px; }
    .receipt-no { font-size:14px; font-weight:700; color:#e53e3e; }
    .stamp-box { border:3px solid #3385ff; display:inline-block; padding:10px 18px; text-align:center; }
    th { background:#081f4e; color:#fff; padding:9px 8px; border:1px solid #081f4e; text-align:left; font-size:11px; }
    .balance-row { font-size:14px; font-weight:700; margin:14px 0; text-align:right; }
    .note-box { margin-top:16px; }
    .payment-methods { width:100%; border-collapse:collapse; margin-top:14px; }
    .pm-cell { width:50%; vertical-align:top; padding:14px; border:1px solid #ccc; }
    .pm-title { font-size:15px; font-weight:800; margin-bottom:10px; }
</style>
</head>
<body>

<table class="header-table" cellpadding="0" cellspacing="0">
<tr>
    <td style="width:120px;vertical-align:middle;">{$logoHtml}</td>
    <td style="text-align:center;vertical-align:middle;">
        <div class="paid-banner">PAID (Course Fee)</div>
        <div style="margin-top:8px;">
            <div class="stamp-box">
                <div style="font-size:13px;font-weight:700;color:#3385ff;">{$institutionName}</div>
                <div style="font-size:12px;font-weight:700;color:#fe730c;margin-top:4px;">P A I D</div>
                <div style="font-size:11px;color:#3385ff;margin-top:4px;">P.O. Box 1334-00618, NAIROBI</div>
            </div>
        </div>
    </td>
</tr>
</table>

<div class="receipt-divider"></div>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
<tr>
    <td style="vertical-align:top;width:50%;">
        <div class="section-label">Receipt No</div>
        <div class="receipt-no">{$receiptNo}</div>
    </td>
    <td style="text-align:right;vertical-align:top;width:50%;">
        <div class="section-label">Date Paid</div>
        <div style="font-size:14px;font-weight:700;color:#e53e3e;">{$datePaid}</div>
    </td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
<tr>
    <td style="vertical-align:top;width:55%;">
        <div class="section-label" style="margin-bottom:6px;">Student Details</div>
        <div class="info-block">
            <strong>Student Name:</strong> {$studentName}<br/>
            <strong>Course:</strong> {$courseName}<br/>
            <strong>Class:</strong> {$intakeName}<br/>
            <strong>Techsphere Class:</strong> {$tsClassName}
        </div>
    </td>
    <td style="vertical-align:top;width:45%;text-align:right;">
        <div class="section-label" style="margin-bottom:6px;">Paid To</div>
        <div class="inst-name">{$institutionName}</div>
        <div class="info-block" style="margin-top:4px;">
            {$address}<br/>
            Website: {$website}<br/>
            Email: {$email}
        </div>
    </td>
</tr>
</table>

<div style="margin-bottom:14px;line-height:1.8;">
    <strong>Amount Paid:</strong> Ksh {$amountPaid}<br/>
    <strong>Date Paid:</strong> {$datePaid}<br/>
    <strong>Ref No:</strong> {$receiptNo}
</div>

<div class="receipt-divider"></div>

<div style="font-weight:700;text-align:center;margin:10px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
    Payment Details (This include details of the current payments)
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px;">
<thead>
<tr>
    <th style="width:8%;">#</th>
    <th>Amount Paid (Ksh)</th>
    <th>Date Paid</th>
    <th>Payment Method</th>
    <th>Payment Ref No</th>
</tr>
</thead>
<tbody>
{$paymentRows}
</tbody>
</table>

<div class="balance-row">
    <span style="color:#222;">{$balanceLabel} (as at {$balanceAt}):</span>
    <span style="color:{$balanceColor};font-size:16px;"> Ksh {$balanceAmt}</span>
</div>

<div class="receipt-divider"></div>

<div class="note-box">
    <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Note:</div>
    <div style="line-height:1.7;">
        Make payment through Mpesa or Bank and send payment details to
        <strong style="color:#e53e3e;">{$phone}</strong> or email to
        <strong style="color:#e53e3e;">{$email}</strong>
    </div>
</div>

<table class="payment-methods" cellpadding="0" cellspacing="0">
<tr>
    <td class="pm-cell">
        <div class="pm-title">Mpesa</div>
        <div style="line-height:1.9;">
            1. <strong>Business Name:</strong> {$mpesaBizName}<br/>
            2. <strong>Paybill No:</strong> {$mpesaPaybill}<br/>
            3. <strong>Account No:</strong> {$mpesaAccNo}
        </div>
    </td>
    <td class="pm-cell">
        <div class="pm-title">BANK</div>
        <div style="line-height:1.9;">
            1. <strong>Bank:</strong> {$bankName}<br/>
            2. <strong>Account Name:</strong> {$bankAccName}<br/>
            3. <strong>Account No:</strong> {$bankAccNo}
        </div>
    </td>
</tr>
</table>

</body>
</html>
HTML;
    }
}
