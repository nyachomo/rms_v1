<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Models\AdmissionLetterConfig;
use App\Models\Enrollment;
use App\Models\RegistrationFee;
use App\Models\Role;
use App\Models\TechsphereClass;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class RegistrationFeeController extends Controller
{
    private function hasPermission(string $action): bool
    {
        $user = Auth::user();
        if (!$user) return false;
        if ($user->role_id === null) return true;
        $user->loadMissing('role.permissions');
        return $user->role && $user->role->permissions
            ->where('module', 'registration_fees')
            ->where('action', $action)
            ->isNotEmpty();
    }

    public function index(Request $request): JsonResponse
    {
        if (!$this->hasPermission('view')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $studentRoleIds = Role::whereRaw('LOWER(name) LIKE ?', ['%student%'])->pluck('id');

        $query = User::whereIn('role_id', $studentRoleIds)
            ->with('registrationFee')
            ->select('id', 'name', 'email', 'status', 'role_id');

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($w) use ($q) {
                $w->where('name',  'like', "%{$q}%")
                  ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($request->filled('fee_status')) {
            if ($request->fee_status === 'paid') {
                $query->whereHas('registrationFee');
            } elseif ($request->fee_status === 'unpaid') {
                $query->whereDoesntHave('registrationFee');
            }
        }

        $users = $query->latest()->paginate($request->input('per_page', 20));

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$this->hasPermission('create')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $data = $request->validate([
            'user_id'         => 'required|exists:users,id',
            'amount_paid'     => 'required|numeric|min:0.01',
            'date_paid'       => 'required|date',
            'payment_ref_no'  => 'nullable|string|max:100',
            'payment_method'  => 'required|string|max:50',
        ]);

        if (RegistrationFee::where('user_id', $data['user_id'])->exists()) {
            return response()->json(['message' => 'This student already has a registration fee record. Use update instead.'], 422);
        }

        $fee = RegistrationFee::create($data);
        $fee->load('user:id,name,email');

        return response()->json($fee, 201);
    }

    public function update(Request $request, RegistrationFee $registrationFee): JsonResponse
    {
        if (!$this->hasPermission('update')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $data = $request->validate([
            'amount_paid'    => 'required|numeric|min:0.01',
            'date_paid'      => 'required|date',
            'payment_ref_no' => 'nullable|string|max:100',
            'payment_method' => 'required|string|max:50',
        ]);

        $registrationFee->update($data);

        return response()->json($registrationFee->load('user:id,name,email'));
    }

    public function destroy(RegistrationFee $registrationFee): JsonResponse
    {
        if (!$this->hasPermission('delete')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $registrationFee->delete();

        return response()->json(['message' => 'Registration fee deleted.']);
    }

    public function downloadReceipt(RegistrationFee $registrationFee)
    {
        if (!$this->hasPermission('download')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $registrationFee->load('user:id,name,email');
        $setting = CompanySetting::query()->first();
        $config  = AdmissionLetterConfig::firstOrCreate(['id' => 1]);

        $institutionName = $setting?->company_name    ?? 'Techsphere Training Institute';
        $address         = $setting?->company_address ?? 'PO BOX 1334-00618, NAIROBI View Park Towers 17th Floor';
        $website         = 'https://www.techsphereinstitute.co.ke';
        $email           = $setting?->company_email   ?? 'Info@techsphereinstitute.ac.ke';
        $phone           = $setting?->company_phone   ?? '+254768919307';

        $logoPath = public_path('logo/Logo.jpeg');
        $logoData = file_exists($logoPath)
            ? 'data:image/jpeg;base64,' . base64_encode(file_get_contents($logoPath))
            : null;

        $userId = $registrationFee->user->id;

        $enrollments = Enrollment::where('user_id', $userId)
            ->with('course:id,title')
            ->get();

        $techsphereClass = TechsphereClass::whereHas('enrolledUsers', fn($q) => $q->where('users.id', $userId))->first();

        $html = $this->buildReceiptHtml($registrationFee, $config, $institutionName, $address, $website, $email, $phone, $logoData, $enrollments, $techsphereClass);

        $pdf      = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $safeName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $registrationFee->user->name ?? 'student');
        $filename = 'RegFee_Receipt_' . ($registrationFee->payment_ref_no ?? $registrationFee->id) . '_' . $safeName . '.pdf';

        return $pdf->download($filename);
    }

    private function buildReceiptHtml(
        RegistrationFee $fee,
        AdmissionLetterConfig $config,
        string $institutionName,
        string $address,
        string $website,
        string $email,
        string $phone,
        ?string $logoData,
        \Illuminate\Database\Eloquent\Collection $enrollments,
        ?TechsphereClass $techsphereClass = null
    ): string {
        $logoHtml = $logoData
            ? "<img src=\"{$logoData}\" style=\"width:140px;height:140px;border-radius:50%;object-fit:cover;\" />"
            : "<div style=\"width:140px;height:140px;border-radius:50%;background:#081f4e;text-align:center;line-height:140px;\"><span style=\"color:#fff;font-size:56px;font-weight:800;\">T</span></div>";

        $receiptNo    = htmlspecialchars($fee->payment_ref_no ?? "#{$fee->id}");
        $datePaid     = Carbon::parse($fee->date_paid)->format('Y-m-d');
        $amountPaid   = number_format($fee->amount_paid, 0);
        $studentName  = htmlspecialchars($fee->user->name ?? '—');
        $studentEmail = htmlspecialchars($fee->user->email ?? '—');
        $balanceAt    = Carbon::parse($fee->created_at ?? now())->format('Y-m-d H:i:s');

        $courseList = $enrollments->isNotEmpty()
            ? implode(', ', $enrollments->map(fn($e) => htmlspecialchars($e->course?->title ?? '—'))->toArray())
            : '—';
        $className = htmlspecialchars($techsphereClass?->name ?? 'N/A');

        $mpesaBizName = htmlspecialchars($config->mpesa_business_name ?? 'Techsphere Institute');
        $mpesaPaybill = htmlspecialchars($config->mpesa_paybill       ?? '522533');
        $mpesaAccNo   = htmlspecialchars($config->mpesa_acc_no        ?? '7855887');
        $bankName     = htmlspecialchars($config->bank_name           ?? 'Kenya Commercial Bank');
        $bankAccName  = htmlspecialchars($config->bank_acc_name       ?? 'Techsphere Institute');
        $bankAccNo    = htmlspecialchars($config->bank_acc_no         ?? '1327338564');

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
        <div class="paid-banner">PAID (Registration Fee)</div>
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
            <strong>Email:</strong> {$studentEmail}<br/>
            <strong>Course(s):</strong> {$courseList}<br/>
            <strong>Class:</strong> {$className}<br/>
            <strong>Fee Type:</strong> Registration Fee
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
    <strong>Ref No:</strong> {$receiptNo}<br/>
    <strong>Payment Method:</strong> {$fee->payment_method}
</div>

<div class="receipt-divider"></div>

<div style="font-size:14px;font-weight:700;text-align:right;margin:14px 0;">
    <span style="color:#222;">Amount Paid (as at {$balanceAt}):</span>
    <span style="color:#38a169;font-size:16px;"> Ksh {$amountPaid}</span>
</div>

<div class="receipt-divider"></div>

<div style="margin-top:16px;">
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
