<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\IctClubRegistration;
use App\Models\School;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        /* ── KPI totals ── */
        $totals = [
            'students'             => Student::count(),
            'active_students'      => Student::where('status', 'active')->count(),
            'teachers'             => Teacher::count(),
            'active_teachers'      => Teacher::where('status', 'active')->count(),
            'courses'              => Course::where('status', 'published')->count(),
            'schools'              => School::count(),
            'enrollments_total'    => Enrollment::count(),
            'enrollments_pending'  => Enrollment::where('status', 'pending')->count(),
            'enrollments_approved' => Enrollment::where('status', 'approved')->count(),
            'ict_club_total'       => IctClubRegistration::count(),
            'ict_club_pending'     => IctClubRegistration::where('status', 'pending')->count(),
        ];

        /* ── Enrollment trend — last 6 months ── */
        $enrollmentTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $enrollmentTrend[] = [
                'label'    => $month->format('M Y'),
                'approved' => Enrollment::where('status', 'approved')
                    ->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->count(),
                'pending'  => Enrollment::where('status', 'pending')
                    ->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->count(),
            ];
        }

        /* ── Enrollment by status ── */
        $enrollmentByStatus = [
            ['name' => 'Approved', 'value' => $totals['enrollments_approved']],
            ['name' => 'Pending',  'value' => $totals['enrollments_pending']],
            ['name' => 'Rejected', 'value' => Enrollment::where('status', 'rejected')->count()],
        ];

        /* ── Top 5 courses by enrollment count ── */
        $topCourses = DB::table('enrollments')
            ->join('courses', 'enrollments.course_id', '=', 'courses.id')
            ->selectRaw('courses.title as name, COUNT(enrollments.id) as total')
            ->groupBy('courses.id', 'courses.title')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($r) => ['name' => $r->name, 'total' => (int) $r->total])
            ->values();

        /* ── Top 5 schools by student count ── */
        $studentsBySchool = DB::table('students')
            ->join('schools', 'students.school_id', '=', 'schools.id')
            ->selectRaw('schools.school_name as name, COUNT(students.id) as total')
            ->groupBy('schools.id', 'schools.school_name')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($r) => ['name' => $r->name, 'total' => (int) $r->total])
            ->values();

        /* ── ICT Club by status ── */
        $ictByStatus = [
            ['name' => 'Approved', 'value' => IctClubRegistration::where('status', 'approved')->count()],
            ['name' => 'Pending',  'value' => IctClubRegistration::where('status', 'pending')->count()],
            ['name' => 'Rejected', 'value' => IctClubRegistration::where('status', 'rejected')->count()],
        ];

        /* ── Student gender split ── */
        $genderSplit = DB::table('students')
            ->selectRaw('gender, COUNT(*) as total')
            ->groupBy('gender')
            ->get()
            ->map(fn($r) => ['name' => ucfirst($r->gender ?? 'Unknown'), 'value' => (int) $r->total])
            ->values();

        /* ── Recent 6 enrollments ── */
        $recentEnrollments = Enrollment::with('course:id,title')
            ->latest()
            ->limit(6)
            ->get(['id', 'name', 'email', 'course_id', 'status', 'created_at'])
            ->map(fn($e) => [
                'id'         => $e->id,
                'name'       => $e->name,
                'email'      => $e->email,
                'course'     => $e->course?->title ?? '—',
                'status'     => $e->status,
                'created_at' => $e->created_at->format('d M Y'),
            ]);

        return response()->json(compact(
            'totals', 'enrollmentTrend', 'enrollmentByStatus',
            'topCourses', 'studentsBySchool', 'ictByStatus',
            'genderSplit', 'recentEnrollments'
        ));
    }
}
