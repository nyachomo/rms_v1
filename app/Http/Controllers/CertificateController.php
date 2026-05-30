<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Models\Course;
use App\Models\LessonExamAttempt;
use App\Models\LessonExamQuestion;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class CertificateController extends Controller
{
    public function download(Request $request, Course $course, User $user)
    {
        // Collect all exam lesson IDs for this course that have questions
        $examLessonIds = LessonExamQuestion::whereHas('lesson', fn($q) => $q
                ->where('course_id', $course->id)
                ->whereNotNull('pass_mark')
            )
            ->pluck('lesson_id')
            ->unique();

        if ($examLessonIds->isEmpty()) {
            return response()->json(['message' => 'No assessments found for this course.'], 404);
        }

        // Best scores per lesson
        $attempts = LessonExamAttempt::whereIn('lesson_id', $examLessonIds)
            ->where('user_id', $user->id)
            ->selectRaw('lesson_id, MAX(score) as best_score, MAX(CASE WHEN passed=1 THEN 1 ELSE 0 END) as ever_passed')
            ->groupBy('lesson_id')
            ->get();

        if ($attempts->isEmpty() || $attempts->every(fn($a) => !$a->ever_passed)) {
            return response()->json(['message' => 'Student has not passed any assessments in this course.'], 422);
        }

        // Course average across attempted lessons
        $scores    = $attempts->map(fn($a) => (float) $a->best_score);
        $avgScore  = round($scores->avg(), 1);

        // Date of last passed attempt
        $lastPassed = LessonExamAttempt::whereIn('lesson_id', $examLessonIds)
            ->where('user_id', $user->id)
            ->where('passed', true)
            ->latest('updated_at')
            ->first();

        $completedDate = $lastPassed
            ? $lastPassed->updated_at->format('d F Y')
            : now()->format('d F Y');

        $setting      = CompanySetting::first();
        $institutionName = $setting?->company_name ?? config('app.name', 'Techsphere Institute');
        $logoPath     = public_path('logo/Logo.jpeg');
        $logoData     = file_exists($logoPath)
            ? 'data:image/jpeg;base64,' . base64_encode(file_get_contents($logoPath))
            : null;

        $html = $this->buildCertificateHtml([
            'studentName'     => $user->name,
            'courseTitle'     => $course->title,
            'avgScore'        => $avgScore,
            'completedDate'   => $completedDate,
            'institutionName' => $institutionName,
            'logoData'        => $logoData,
        ]);

        $pdf = Pdf::loadHTML($html)
            ->setPaper([0, 0, 841.89, 595.28], 'landscape'); // A4 landscape

        $filename = 'Certificate_' . str_replace(' ', '_', $user->name) . '_' . str_replace(' ', '_', $course->title) . '.pdf';

        return $pdf->download($filename);
    }

    private function buildCertificateHtml(array $d): string
    {
        $logo = $d['logoData']
            ? "<img src=\"{$d['logoData']}\" style=\"width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #fe730c;\" />"
            : "<div style=\"width:80px;height:80px;border-radius:50%;background:#fe730c;display:flex;align-items:center;justify-content:center;\"><span style=\"color:#fff;font-size:2rem;font-weight:800;\">T</span></div>";

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 841px; height: 595px;
    font-family: 'DejaVu Sans', sans-serif;
    background: #fff;
    overflow: hidden;
  }
  .page {
    width: 841px; height: 595px;
    position: relative;
    background: #fff;
  }

  /* Decorative navy side bar */
  .sidebar-left {
    position: absolute; left: 0; top: 0; bottom: 0; width: 22px;
    background: linear-gradient(to bottom, #081f4e, #0d2d6b, #fe730c);
  }
  .sidebar-right {
    position: absolute; right: 0; top: 0; bottom: 0; width: 22px;
    background: linear-gradient(to bottom, #fe730c, #0d2d6b, #081f4e);
  }

  /* Top & bottom accent strips */
  .strip-top {
    position: absolute; top: 0; left: 22px; right: 22px; height: 8px;
    background: #081f4e;
  }
  .strip-bottom {
    position: absolute; bottom: 0; left: 22px; right: 22px; height: 8px;
    background: #081f4e;
  }
  .strip-top-accent {
    position: absolute; top: 8px; left: 22px; right: 22px; height: 4px;
    background: #fe730c;
  }
  .strip-bottom-accent {
    position: absolute; bottom: 8px; left: 22px; right: 22px; height: 4px;
    background: #fe730c;
  }

  /* Corner ornaments */
  .corner {
    position: absolute; width: 60px; height: 60px;
    border: 4px solid #fe730c; opacity: .35;
  }
  .corner-tl { top: 24px; left: 32px; border-right: none; border-bottom: none; }
  .corner-tr { top: 24px; right: 32px; border-left: none; border-bottom: none; }
  .corner-bl { bottom: 24px; left: 32px; border-right: none; border-top: none; }
  .corner-br { bottom: 24px; right: 32px; border-left: none; border-top: none; }

  /* Main content area */
  .content {
    position: absolute;
    top: 20px; left: 40px; right: 40px; bottom: 20px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
  }

  .logo-wrap { margin-bottom: 10px; }

  .institution {
    font-size: 13px; font-weight: 700; letter-spacing: .18em;
    color: #fe730c; text-transform: uppercase; margin-bottom: 4px;
  }

  .cert-title {
    font-size: 32px; font-weight: 700; color: #081f4e;
    letter-spacing: .06em; text-transform: uppercase;
    margin-bottom: 10px;
    border-bottom: 2px solid #fe730c;
    padding-bottom: 8px;
  }

  .presented {
    font-size: 12px; color: #64748b; margin-bottom: 6px;
  }

  .student-name {
    font-size: 34px; font-weight: 700; color: #081f4e;
    margin-bottom: 6px; letter-spacing: .02em;
  }

  .completed-text {
    font-size: 12px; color: #64748b; margin-bottom: 4px;
  }

  .course-name {
    font-size: 20px; font-weight: 700; color: #fe730c;
    margin-bottom: 14px;
  }

  .score-badge {
    display: inline-block;
    background: #081f4e; color: #fff;
    padding: 5px 22px; border-radius: 20px;
    font-size: 13px; font-weight: 700; margin-bottom: 18px;
    letter-spacing: .06em;
  }

  .footer-row {
    display: flex; justify-content: space-between; align-items: flex-end;
    width: 100%; margin-top: 4px;
    padding: 0 20px;
  }
  .sig-block { text-align: center; min-width: 160px; }
  .sig-line {
    width: 160px; height: 1px; background: #081f4e; margin: 0 auto 4px;
  }
  .sig-label { font-size: 10px; color: #64748b; letter-spacing: .05em; text-transform: uppercase; }
  .cert-id { font-size: 9px; color: #cbd5e1; }
</style>
</head>
<body>
<div class="page">
  <!-- Decorative borders -->
  <div class="sidebar-left"></div>
  <div class="sidebar-right"></div>
  <div class="strip-top"></div>
  <div class="strip-bottom"></div>
  <div class="strip-top-accent"></div>
  <div class="strip-bottom-accent"></div>
  <!-- Corner ornaments -->
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>

  <!-- Content -->
  <div class="content">
    <div class="logo-wrap">{$logo}</div>
    <div class="institution">{$d['institutionName']}</div>
    <div class="cert-title">Certificate of Achievement</div>
    <div class="presented">This is to proudly certify that</div>
    <div class="student-name">{$d['studentName']}</div>
    <div class="completed-text">has successfully completed the course</div>
    <div class="course-name">{$d['courseTitle']}</div>
    <div class="score-badge">Average Score: {$d['avgScore']}%</div>

    <div class="footer-row">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Date Issued</div>
        <div class="sig-label" style="font-weight:700;color:#081f4e;margin-top:2px;">{$d['completedDate']}</div>
      </div>
      <div class="cert-id">CERT · {$d['institutionName']}</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Authorised Signature</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
HTML;
    }
}
