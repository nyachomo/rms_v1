<?php

namespace App\Http\Controllers;

use App\Models\AdmissionLetterConfig;
use App\Models\CompanySetting;
use App\Models\Enrollment;
use App\Models\RolePermission;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AdmissionLetterController extends Controller
{
    public function getConfig()
    {
        $config = AdmissionLetterConfig::firstOrCreate(['id' => 1]);
        $data   = $config->toArray();
        if ($config->director_signature) {
            $data['signature_url'] = url('/api/admission-letter/signature');
        }
        return response()->json($data);
    }

    public function updateConfig(Request $request)
    {
        $data = $request->validate([
            'institute_prefix'          => 'nullable|string|max:20',
            'orientation_date'          => 'nullable|date',
            'orientation_time'          => 'nullable|string|max:20',
            'class_start_date'          => 'nullable|date',
            'zoom_link'                 => 'nullable|string|max:500',
            'meeting_id'                => 'nullable|string|max:100',
            'zoom_passcode'             => 'nullable|string|max:100',
            'schedule'                  => 'nullable|string|max:200',
            'duration_weeks'            => 'nullable|integer|min:1',
            'total_fee'                 => 'nullable|numeric|min:0',
            'first_installment_label'   => 'nullable|string|max:100',
            'first_installment_amount'  => 'nullable|numeric|min:0',
            'second_installment_label'  => 'nullable|string|max:100',
            'second_installment_amount' => 'nullable|numeric|min:0',
            'third_installment_label'   => 'nullable|string|max:100',
            'third_installment_amount'  => 'nullable|numeric|min:0',
            'monthly_fee_label'         => 'nullable|string|max:100',
            'monthly_fee_amount'        => 'nullable|numeric|min:0',
            'mpesa_business_name'       => 'nullable|string|max:200',
            'mpesa_paybill'             => 'nullable|string|max:100',
            'mpesa_acc_no'              => 'nullable|string|max:100',
            'bank_name'                 => 'nullable|string|max:200',
            'bank_acc_name'             => 'nullable|string|max:200',
            'bank_acc_no'               => 'nullable|string|max:100',
            'director_name'             => 'nullable|string|max:200',
            'director_title'            => 'nullable|string|max:200',
            'show_director_name'        => 'nullable|boolean',
            'show_meeting_id'           => 'nullable|boolean',
            'show_passcode'             => 'nullable|boolean',
        ]);

        $config = AdmissionLetterConfig::updateOrCreate(['id' => 1], $data);
        return response()->json($config);
    }

    public function serveSignature()
    {
        try {
            $config = AdmissionLetterConfig::firstOrCreate(['id' => 1]);
            if (!$config->director_signature) {
                return response()->json(['message' => 'No signature set.'], 404);
            }

            $path = storage_path('app/public/' . $config->director_signature);

            if (!file_exists($path)) {
                Log::error('Signature file not found: ' . $path);
                return response()->json(['message' => 'Signature file not found.'], 404);
            }

            $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            $mime = match($ext) {
                'png'  => 'image/png',
                'gif'  => 'image/gif',
                'webp' => 'image/webp',
                default => 'image/jpeg',
            };

            return response(file_get_contents($path), 200, [
                'Content-Type'  => $mime,
                'Cache-Control' => 'private, max-age=3600',
            ]);
        } catch (\Throwable $e) {
            Log::error('serveSignature error: ' . $e->getMessage());
            return response()->json(['message' => 'Server error: ' . $e->getMessage()], 500);
        }
    }

    public function uploadSignature(Request $request)
    {
        try {
            if (!$request->hasFile('signature')) {
                return response()->json(['message' => 'No file uploaded.'], 422);
            }

            $file = $request->file('signature');
            $ext  = strtolower($file->getClientOriginalExtension());

            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                return response()->json(['message' => 'File must be JPG, PNG, GIF, or WEBP.'], 422);
            }

            $filename   = 'signatures/sig_' . uniqid() . '.' . $ext;
            $storageDir = storage_path('app/public/signatures');
            $fullPath   = storage_path('app/public/' . $filename);

            // Use native PHP to avoid finfo dependency on servers without fileinfo extension
            if (!is_dir($storageDir)) {
                mkdir($storageDir, 0755, true);
            }

            if (!move_uploaded_file($file->getRealPath(), $fullPath)) {
                return response()->json(['message' => 'Failed to save file. Check storage permissions.'], 500);
            }

            $config = AdmissionLetterConfig::firstOrCreate(['id' => 1]);

            // Delete old signature file if it exists
            if ($config->director_signature) {
                $oldPath = storage_path('app/public/' . $config->director_signature);
                if (file_exists($oldPath)) {
                    @unlink($oldPath);
                }
            }

            $config->update(['director_signature' => $filename]);
            return response()->json(['path' => $filename, 'url' => url('/api/admission-letter/signature')]);
        } catch (\Throwable $e) {
            Log::error('uploadSignature error: ' . $e->getMessage());
            return response()->json(['message' => 'Upload error: ' . $e->getMessage()], 500);
        }
    }

    public function deleteSignature()
    {
        $config = AdmissionLetterConfig::firstOrCreate(['id' => 1]);
        if ($config->director_signature) {
            $path = storage_path('app/public/' . $config->director_signature);
            if (file_exists($path)) {
                @unlink($path);
            }
        }
        $config->update(['director_signature' => null]);
        return response()->json(['message' => 'Signature removed.']);
    }

    public function downloadAdmin(Enrollment $enrollment)
    {
        return $this->generatePdf($enrollment);
    }

    public function downloadStudent(Request $request)
    {
        $user = Auth::user();
        if ($user && $user->role_id !== null) {
            $hasPermission = RolePermission::where('role_id', $user->role_id)
                ->where('module', 'admission_letter')
                ->where('action', 'download')
                ->exists();
            if (!$hasPermission) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
        }

        $userId     = $request->user()?->id;
        $enrollment = Enrollment::query()
            ->where('user_id', '=', $userId)
            ->where('status', '=', 'approved')
            ->with(['course.curriculum', 'intake'])
            ->latest()
            ->first();

        if (!$enrollment) {
            return response()->json(['message' => 'No approved enrollment found.'], 404);
        }

        return $this->generatePdf($enrollment);
    }

    private function generatePdf(Enrollment $enrollment)
    {
        $enrollment->load(['course.curriculum', 'intake']);

        $config   = AdmissionLetterConfig::firstOrCreate(['id' => 1]);
        $setting  = CompanySetting::query()->first();

        $institutionName = $setting?->company_name ?? 'Techsphere Training Institute';
        $logoPath = public_path('logo/Logo.jpeg');
        $logoData = file_exists($logoPath)
            ? 'data:image/jpeg;base64,' . base64_encode(file_get_contents($logoPath))
            : null;

        $prefix  = $config->institute_prefix ?? 'TTI';
        $month   = Carbon::parse($enrollment->created_at)->format('M');
        $year    = Carbon::parse($enrollment->created_at)->format('Y');
        $seq     = str_pad($enrollment->id, 3, '0', STR_PAD_LEFT);
        $admNo   = strtoupper("{$prefix}/{$month}/{$year}/{$seq}");

        $html = $this->buildHtml($enrollment, $config, $setting, $logoData, $admNo, $institutionName);

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');

        $filename = 'Admission_Letter_' . str_replace([' ', '/'], '_', $enrollment->name) . '.pdf';
        return $pdf->download($filename);
    }

    private function buildHtml(
        Enrollment $enrollment,
        AdmissionLetterConfig $config,
        ?CompanySetting $setting,
        ?string $logoData,
        string $admNo,
        string $institutionName
    ): string {
        $course    = $enrollment->course;
        $firstName = explode(' ', trim($enrollment->name))[0];

        $address  = $setting?->company_address ?? 'View Park Towers 17th Floor, University way | P. O. Box 1334-00618, Nairobi';
        $web      = 'www.techsphereinstitute.co.ke';
        $email    = $setting?->company_email ?? 'Info@techsphereinstitute.co.ke';
        $phone    = $setting?->company_phone ?? '+254768919307';
        $director = $config->director_name  ?? 'Ibrahim Gichemba';
        $dirTitle = $config->director_title ?? "Director {$institutionName}";

        $date = strtoupper(Carbon::parse($enrollment->created_at)->format('d M Y'));

        $logo = $logoData
            ? "<img src=\"{$logoData}\" style=\"width:130px;height:130px;border-radius:50%;object-fit:cover;\" />"
            : "<div style=\"width:130px;height:130px;border-radius:50%;background:#081f4e;text-align:center;line-height:130px;\"><span style=\"color:#fff;font-size:48px;font-weight:800;\">T</span></div>";

        $header = <<<HTML
<table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td style="text-align:center;padding-bottom:8px;">
            {$logo}
            <div style="font-size:22px;font-weight:700;color:#081f4e;margin-top:8px;letter-spacing:1px;">{$institutionName}</div>
            <div style="font-size:11px;color:#444;margin-top:4px;">{$address}</div>
            <div style="font-size:11px;color:#444;margin-top:3px;">Web: <span style="color:#081f4e;">{$web}</span> &nbsp;|&nbsp; Email: <span style="color:#081f4e;">{$email}</span> &nbsp;|&nbsp; Phone: <span style="color:#fe730c;">{$phone}</span></div>
        </td>
    </tr>
    <tr>
        <td><div style="border-top:2px solid #081f4e;margin:6px 0;"></div></td>
    </tr>
</table>
HTML;

        $stamp = <<<HTML
<table cellpadding="8" cellspacing="0" style="border:3px solid #081f4e;display:inline-table;text-align:center;min-width:160px;">
    <tr><td style="font-size:22px;font-weight:800;color:#081f4e;letter-spacing:6px;">T &nbsp; T &nbsp; I</td></tr>
    <tr><td style="font-size:12px;font-weight:700;color:#081f4e;">{$institutionName}</td></tr>
    <tr><td style="font-size:15px;font-weight:700;color:#fe730c;">{$date}</td></tr>
    <tr><td style="font-size:12px;color:#081f4e;">P.O. Box 1334 - 00618,<br/>NAIROBI.</td></tr>
</table>
HTML;

        // Signature image
        $sigImgHtml = '';
        if ($config->director_signature) {
            $sigPath = storage_path('app/public/' . $config->director_signature);
            if (file_exists($sigPath)) {
                $ext     = strtolower(pathinfo($sigPath, PATHINFO_EXTENSION));
                $mime    = $ext === 'png' ? 'image/png' : 'image/jpeg';
                $sigB64  = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($sigPath));
                $sigImgHtml = "<img src=\"{$sigB64}\" style=\"height:60px;max-width:180px;object-fit:contain;display:block;margin-bottom:2px;\" />";
            }
        }

        $showDirector = $config->show_director_name ?? true;
        $directorName = $showDirector
            ? "<em style=\"font-style:italic;\">{$director}</em>"
            : '';
        $directorBlock = "<td style=\"width:55%;vertical-align:bottom;font-size:11px;color:#081f4e;font-weight:600;\">
                Yours Faithfully,<br/><br/>
                {$sigImgHtml}
                {$directorName}
                <br/>
                <span style=\"border-top:1px solid #081f4e;padding-top:3px;display:inline-block;\">{$dirTitle}</span>
               </td>";

        $signature = <<<HTML
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr>
        {$directorBlock}
        <td style="width:45%;text-align:center;vertical-align:bottom;">
            {$stamp}
        </td>
    </tr>
</table>
HTML;

        // ── PAGE 1: Welcome + Orientation + Class Info ───────────────
        $orientationDate = $config->orientation_date
            ? strtoupper(Carbon::parse($config->orientation_date)->format('d M Y'))
            : '—';
        $orientationTime = $config->orientation_time ?? '10:00 a.m.';
        $classStartDate  = $config->class_start_date
            ? Carbon::parse($config->class_start_date)->format('d M Y')
            : '—';
        $courseTitle      = $course?->title ?? '—';
        $courseTitleUpper = strtoupper($courseTitle);
        $courseCode       = $course?->category ?? '';
        $courseCodeUpper  = $courseCode ? ' (' . strtoupper($courseCode) . ')' : '';
        $zoomLink    = htmlspecialchars($config->zoom_link ?? '—');
        $meetingId   = htmlspecialchars($config->meeting_id ?? '—');
        $passcode    = htmlspecialchars($config->zoom_passcode ?? '—');
        $duration    = $config->duration_weeks ? $config->duration_weeks . ' Weeks' : '—';
        $schedule    = htmlspecialchars($config->schedule ?? '—');
        $meetingIdRow = ($config->show_meeting_id ?? true)
            ? "<tr><td colspan=\"2\" style=\"padding-bottom:3px;\"><strong>Meeting ID:</strong> {$meetingId}</td></tr>"
            : '';
        $passcodeRow  = ($config->show_passcode ?? true)
            ? "<tr><td colspan=\"2\" style=\"padding-bottom:8px;\"><strong>Passcode:</strong> {$passcode}</td></tr>"
            : '';

        $page1 = <<<HTML
<div style="page-break-after:always;">
{$header}
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;color:#222;margin-top:4px;">
    <tr>
        <td style="width:60%;vertical-align:top;padding-bottom:5px;font-weight:700;">{$enrollment->name}</td>
        <td style="width:40%;text-align:right;vertical-align:top;padding-bottom:5px;font-weight:700;">AdmNo: {$admNo}</td>
    </tr>
    <tr><td colspan="2" style="padding-bottom:2px;">{$enrollment->phone}</td></tr>
    <tr><td colspan="2" style="padding-bottom:2px;">{$enrollment->email}</td></tr>
    <tr><td colspan="2" style="padding-bottom:8px;font-weight:700;">{$date}</td></tr>
    <tr><td colspan="2" style="padding-bottom:8px;">Dear {$firstName},</td></tr>
    <tr>
        <td colspan="2" style="padding-bottom:10px;">
            <strong><u>SUBJECT: ADMISSION INTO {$courseTitleUpper}{$courseCodeUpper}</u></strong>
        </td>
    </tr>
    <tr>
        <td colspan="2" style="padding-bottom:10px;line-height:1.65;">
            Congratulations on being awarded a scholarship to join {$institutionName} and
            for expressing interest in our <strong>{$courseTitleUpper}{$courseCodeUpper}!</strong>
            We are excited about the possibility of having you in our learning community and commend
            your enthusiasm to gain valuable programming skills.
        </td>
    </tr>
    <tr>
        <td colspan="2" style="padding-bottom:6px;">
            <strong>Action Required: Complete Your Enrollment (Only those who have not enrolled)</strong>
        </td>
    </tr>
    <tr>
        <td colspan="2" style="padding-bottom:10px;line-height:1.65;">
            To secure your place in this course, please complete your enrollment.
            This will ensure that you are ready to start along with your classmates.
        </td>
    </tr>
    <tr>
        <td colspan="2" style="padding-bottom:6px;"><strong>Orientation and Class Start Dates</strong></td>
    </tr>
    <tr>
        <td colspan="2" style="padding-bottom:4px;line-height:1.65;">
            &bull; <strong>Orientation:</strong> Scheduled for <strong>{$orientationDate}, at {$orientationTime}</strong>
            (attendance is highly encouraged to get familiar with course logistics and expectations).
        </td>
    </tr>
    <tr>
        <td colspan="2" style="padding-bottom:10px;">
            &bull; <strong>Classes Begin:</strong> {$classStartDate}.
        </td>
    </tr>
    <tr>
        <td colspan="2" style="padding-bottom:6px;padding-top:6px;font-weight:700;">Class Information</td>
    </tr>
    <tr>
        <td colspan="2" style="padding-bottom:8px;line-height:1.65;">
            The course will be conducted online. Please find the access link to the virtual classroom below:
        </td>
    </tr>
    <tr><td colspan="2" style="padding-bottom:3px;font-weight:700;">Class Link:</td></tr>
    <tr><td colspan="2" style="padding-bottom:6px;color:#081f4e;">{$zoomLink}</td></tr>
    {$meetingIdRow}
    {$passcodeRow}
    <tr><td colspan="2" style="padding-bottom:3px;font-weight:700;">Course Duration:</td></tr>
    <tr><td colspan="2" style="padding-bottom:6px;">{$duration}</td></tr>
    <tr><td colspan="2" style="padding-bottom:3px;font-weight:700;">Class Schedule:</td></tr>
    <tr><td colspan="2" style="padding-bottom:8px;font-weight:700;">{$schedule}</td></tr>
</table>
{$signature}
</div>
HTML;

        // ── PAGE 2: Fee Payment ──────────────────────────────────────
        $totalFee   = $config->total_fee       ? 'KES ' . number_format($config->total_fee, 0) : '—';
        $inst1Label = $config->first_installment_label   ?? 'First Installment (50%)';
        $inst1Amt   = $config->first_installment_amount  ? 'KES ' . number_format($config->first_installment_amount, 0) : '—';
        $inst2Label = $config->second_installment_label  ?? 'Second Installment (25%)';
        $inst2Amt   = $config->second_installment_amount ? 'KES ' . number_format($config->second_installment_amount, 0) : '—';
        $inst3Label = $config->third_installment_label   ?? 'Third Installment (25%)';
        $inst3Amt   = $config->third_installment_amount  ? 'KES ' . number_format($config->third_installment_amount, 0) : '—';
        $monthlyAmt = $config->monthly_fee_amount        ? 'KES ' . number_format($config->monthly_fee_amount, 0) : '—';
        $mpesaBiz   = htmlspecialchars($config->mpesa_business_name ?? '—');
        $mpesaPay   = htmlspecialchars($config->mpesa_paybill ?? '—');
        $mpesaAcc   = htmlspecialchars($config->mpesa_acc_no  ?? '—');
        $bankName   = htmlspecialchars($config->bank_name     ?? '—');
        $bankAccNm  = htmlspecialchars($config->bank_acc_name ?? '—');
        $bankAccNo  = htmlspecialchars($config->bank_acc_no   ?? '—');

        $page3 = <<<HTML
<div style="page-break-after:always;">
{$header}
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;color:#222;margin-top:4px;">
    <tr><td style="padding-bottom:8px;font-weight:700;">Fee Payment</td></tr>
    <tr>
        <td style="padding-bottom:8px;line-height:1.65;">
            While you have received a scholarship covering most of the course fee, a registration fee and administrative fee is required.
        </td>
    </tr>
    <tr><td style="padding-bottom:6px;">Here is the breakdown of the total program fee:</td></tr>
    <tr><td style="padding-bottom:3px;">&bull; <strong>Total Fee:</strong> {$totalFee}</td></tr>
    <tr><td style="padding-bottom:8px;">&bull; <strong>Course duration:</strong> {$duration}</td></tr>
    <tr><td style="padding-bottom:6px;">You can pay the program fee in the following ways (Choose one of the options):</td></tr>
    <tr><td style="padding-bottom:3px;"><strong>1. Three Installments:</strong></td></tr>
    <tr><td style="padding-left:14px;padding-bottom:2px;">&bull; <strong>{$inst1Label}:</strong> {$inst1Amt}</td></tr>
    <tr><td style="padding-left:14px;padding-bottom:2px;">&bull; <strong>{$inst2Label}:</strong> {$inst2Amt}</td></tr>
    <tr><td style="padding-left:14px;padding-bottom:6px;">&bull; <strong>{$inst3Label}:</strong> {$inst3Amt}</td></tr>
    <tr><td style="padding-bottom:3px;"><strong>2. Per Month:</strong></td></tr>
    <tr><td style="padding-left:14px;padding-bottom:8px;">&bull; Pay <strong>{$monthlyAmt}</strong> for each month as you progress through the program.</td></tr>
    <tr><td style="padding-bottom:6px;">Payment can be made through <strong>Mpesa</strong> OR <strong>Bank</strong> Deposit.</td></tr>
    <tr>
        <td>
            <table width="100%" border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-size:11px;">
                <tr>
                    <td style="background:#081f4e;color:#fff;font-weight:700;width:50%;padding:5px;">MPESA</td>
                    <td style="background:#081f4e;color:#fff;font-weight:700;width:50%;padding:5px;">BANK</td>
                </tr>
                <tr>
                    <td style="padding:7px;vertical-align:top;border:1px solid #ccc;font-size:11px;">
                        Business Name: <strong>{$mpesaBiz}</strong><br/>
                        Paybill: <strong>{$mpesaPay}</strong><br/>
                        Acc No: <strong>{$mpesaAcc}</strong>
                    </td>
                    <td style="padding:7px;vertical-align:top;border:1px solid #ccc;font-size:11px;">
                        Bank: <strong>{$bankName}</strong><br/>
                        Acc Name: <strong>{$bankAccNm}</strong><br/>
                        Acc No: <strong>{$bankAccNo}</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
{$signature}
</div>
HTML;

        // ── PAGE 4: Course Outline ───────────────────────────────────
        $curriculum = $course?->curriculum ?? collect();
        $curriculumRows = '';
        if ($curriculum->count() > 0) {
            foreach ($curriculum as $item) {
                $topics = is_array($item->topics)
                    ? $item->topics
                    : (json_decode($item->topics ?? '[]', true) ?? []);
                $topicsList = '';
                foreach ($topics as $topic) {
                    $topicsList .= '<div style="padding:1px 0;">&bull; ' . htmlspecialchars((string) $topic) . '</div>';
                }
                $moduleLabel = htmlspecialchars($item->week_label . ' – ' . $item->title);
                $curriculumRows .= <<<HTML
<tr>
    <td style="border:1px solid #ccc;padding:6px 8px;vertical-align:top;font-weight:700;font-size:11px;">{$moduleLabel}</td>
    <td style="border:1px solid #ccc;padding:6px 8px;vertical-align:top;font-size:11px;">{$topicsList}</td>
</tr>
HTML;
            }
        } else {
            $curriculumRows = '<tr><td colspan="2" style="border:1px solid #ccc;padding:8px;text-align:center;color:#888;">Course outline not available.</td></tr>';
        }

        $page4 = <<<HTML
<div>
{$header}
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:9.5px;color:#222;margin-top:4px;margin-bottom:8px;">
    <tr>
        <td style="text-align:center;font-size:15px;font-weight:700;color:#081f4e;padding-bottom:3px;">
            MASTERY IN {$courseTitleUpper}{$courseCodeUpper}
        </td>
    </tr>
    <tr>
        <td style="text-align:center;font-size:12px;font-weight:600;padding-bottom:8px;">(Course Outline)</td>
    </tr>
</table>
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:11px;">
    <tr>
        <td style="background:#081f4e;color:#fff;font-weight:700;border:1px solid #081f4e;padding:5px 7px;width:38%;">Module</td>
        <td style="background:#081f4e;color:#fff;font-weight:700;border:1px solid #081f4e;padding:5px 7px;width:62%;">Topic</td>
    </tr>
    {$curriculumRows}
</table>
{$signature}
</div>
HTML;

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; color: #222; background: #fff; padding: 24px 30px; }
    @page { margin: 20px 25px; }
</style>
</head>
<body>
{$page1}
{$page3}
{$page4}
</body>
</html>
HTML;
    }
}
