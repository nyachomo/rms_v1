<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseAssessment;
use App\Models\CourseAssessmentScore;
use App\Models\CourseLesson;
use App\Models\Enrollment;
use App\Models\LessonExamAttempt;
use App\Models\LessonExamQuestion;
use App\Models\StudentProgress;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminScoreController extends Controller
{
    /** Courses that have at least one published exam lesson with questions */
    public function courses(): JsonResponse
    {
        $courses = Course::whereHas('lessons', fn($q) => $q
                ->whereNotNull('pass_mark')
                ->whereHas('examQuestions')
            )
            ->with('courseCategory:id,name')
            ->orderBy('title')
            ->get(['id', 'title', 'slug', 'category_id']);

        return response()->json($courses);
    }

    /**
     * Delete all exam attempts for a student on a lesson,
     * and unmark the lesson completion so they can retake it.
     */
    public function resetAttempts(CourseLesson $lesson, User $user): JsonResponse
    {
        LessonExamAttempt::where('lesson_id', $lesson->id)
            ->where('user_id', $user->id)
            ->delete();

        StudentProgress::where('lesson_id', $lesson->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['message' => 'Exam attempts reset. Student may now retake the exam.']);
    }

    /** Full gradebook for one course: exam scores + manual assessment scores */
    public function courseScores(Course $course): JsonResponse
    {
        // ── Lesson exams ──────────────────────────────────────────────────
        $course->load(['modules' => fn($q) => $q
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->with(['lessons' => fn($q) => $q
                ->where('status', 'published')
                ->whereNotNull('pass_mark')
                ->orderBy('sort_order')
                ->select('id', 'module_id', 'course_id', 'title', 'pass_mark'),
            ]),
        ]);

        $allLessonIds  = $course->modules->flatMap(fn($m) => $m->lessons->pluck('id'));
        $examLessonIds = LessonExamQuestion::whereIn('lesson_id', $allLessonIds)->pluck('lesson_id')->unique();

        $modules = $course->modules->map(fn($m) => [
            'id'    => $m->id,
            'title' => $m->title,
            'exams' => $m->lessons
                ->filter(fn($l) => $examLessonIds->contains($l->id))
                ->map(fn($l) => ['id' => $l->id, 'title' => $l->title, 'pass_mark' => (int) $l->pass_mark])
                ->values(),
        ])->filter(fn($m) => $m['exams']->count() > 0)->values();

        // ── Manual assessments ────────────────────────────────────────────
        $manualAssessments = CourseAssessment::where('course_id', $course->id)
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'name', 'max_score']);

        // ── Enrollments ───────────────────────────────────────────────────
        $enrollments     = Enrollment::where('course_id', $course->id)
            ->where('status', 'approved')
            ->with('user:id,name,email')
            ->get();
        $enrolledUserIds = $enrollments->pluck('user_id')->filter()->unique();

        // Early return only when BOTH exam modules AND manual assessments are empty
        if ($modules->isEmpty() && $manualAssessments->isEmpty()) {
            return response()->json([
                'course'              => $course->only(['id', 'title']),
                'modules'             => [],
                'students'            => [],
                'exam_avgs'           => [],
                'module_avgs'         => [],
                'course_avg'          => null,
                'manual_assessments'  => [],
                'manual_avgs'         => [],
            ]);
        }

        $examIds           = $modules->flatMap(fn($m) => $m['exams']->pluck('id'))->values();
        $manualAssessmentIds = $manualAssessments->pluck('id');

        // ── Exam attempt data ─────────────────────────────────────────────
        $attemptsRaw = $examIds->isNotEmpty()
            ? LessonExamAttempt::whereIn('lesson_id', $examIds)
                ->whereIn('user_id', $enrolledUserIds)
                ->selectRaw('user_id, lesson_id, MAX(score) as best_score, COUNT(*) as attempts_count,
                             MAX(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as ever_passed')
                ->groupBy('user_id', 'lesson_id')
                ->get()->groupBy('user_id')
            : collect();

        // ── Manual score data ─────────────────────────────────────────────
        $manualScoresRaw = $manualAssessmentIds->isNotEmpty()
            ? CourseAssessmentScore::whereIn('assessment_id', $manualAssessmentIds)
                ->whereIn('user_id', $enrolledUserIds)
                ->get()->groupBy('user_id')
            : collect();

        // ── Build per-student data ────────────────────────────────────────
        $students = $enrollments->map(function ($enrollment) use (
            $attemptsRaw, $manualScoresRaw, $modules, $examIds, $manualAssessments
        ) {
            $user = $enrollment->user;
            if (!$user) return null;

            // Exam scores
            $byLesson = $attemptsRaw->get($user->id, collect())->keyBy('lesson_id');
            $scores   = [];
            foreach ($examIds as $lessonId) {
                $a = $byLesson->get($lessonId);
                $scores[$lessonId] = $a ? [
                    'score'    => round((float) $a->best_score, 1),
                    'passed'   => (bool) $a->ever_passed,
                    'attempts' => (int) $a->attempts_count,
                ] : null;
            }

            $moduleAvgs = [];
            foreach ($modules as $m) {
                $sc = $m['exams']->map(fn($e) => isset($scores[$e['id']]) ? $scores[$e['id']]['score'] : null)->filter();
                $moduleAvgs[$m['id']] = $sc->isNotEmpty() ? round($sc->avg(), 1) : null;
            }

            $allExamScores = collect($scores)->filter()->map(fn($s) => $s['score']);
            $courseAvg     = $allExamScores->isNotEmpty() ? round($allExamScores->avg(), 1) : null;

            // Manual scores
            $byAssessment  = $manualScoresRaw->get($user->id, collect())->keyBy('assessment_id');
            $manualScores  = [];
            foreach ($manualAssessments as $a) {
                $row = $byAssessment->get($a->id);
                $manualScores[$a->id] = $row ? round((float) $row->score, 1) : null;
            }

            $manualAttempted = collect($manualScores)->filter(fn($v) => $v !== null);
            $manualAvg       = $manualAttempted->isNotEmpty() ? round($manualAttempted->avg(), 1) : null;

            return [
                'user_id'      => $user->id,
                'name'         => $user->name,
                'email'        => $user->email,
                'scores'       => $scores,
                'module_avgs'  => $moduleAvgs,
                'course_avg'   => $courseAvg,
                'manual_scores'=> $manualScores,
                'manual_avg'   => $manualAvg,
            ];
        })->filter()->values();

        // ── Class-level aggregates ────────────────────────────────────────
        $examAvgs = [];
        foreach ($examIds as $lid) {
            $sc = $students->map(fn($s) => isset($s['scores'][$lid]) ? $s['scores'][$lid]['score'] : null)->filter();
            $examAvgs[$lid] = $sc->isNotEmpty() ? round($sc->avg(), 1) : null;
        }

        $moduleAvgs = [];
        foreach ($modules as $m) {
            $sc = $students->map(fn($s) => $s['module_avgs'][$m['id']] ?? null)->filter();
            $moduleAvgs[$m['id']] = $sc->isNotEmpty() ? round($sc->avg(), 1) : null;
        }

        $manualAvgs = [];
        foreach ($manualAssessments as $a) {
            $sc = $students->map(fn($s) => $s['manual_scores'][$a->id] ?? null)->filter();
            $manualAvgs[$a->id] = $sc->isNotEmpty() ? round($sc->avg(), 1) : null;
        }

        $allCourseAvgs = $students->map(fn($s) => $s['course_avg'])->filter();
        $courseAvg     = $allCourseAvgs->isNotEmpty() ? round($allCourseAvgs->avg(), 1) : null;

        $modulesJson = $modules->map(fn($m) => array_merge($m, ['exams' => $m['exams']->values()->toArray()]))->values();

        return response()->json([
            'course'             => $course->only(['id', 'title']),
            'modules'            => $modulesJson,
            'students'           => $students,
            'exam_avgs'          => $examAvgs,
            'module_avgs'        => $moduleAvgs,
            'course_avg'         => $courseAvg,
            'manual_assessments' => $manualAssessments->values(),
            'manual_avgs'        => $manualAvgs,
        ]);
    }
}
