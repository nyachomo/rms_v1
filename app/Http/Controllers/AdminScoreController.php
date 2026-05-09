<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LessonExamAttempt;
use App\Models\LessonExamQuestion;
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
            ->orderBy('title')
            ->get(['id', 'title', 'slug']);

        return response()->json($courses);
    }

    /** Full gradebook for one course: all enrolled students × all exam lessons */
    public function courseScores(Course $course): JsonResponse
    {
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

        $allLessonIds = $course->modules->flatMap(fn($m) => $m->lessons->pluck('id'));

        // Only keep lessons that actually have questions configured
        $examLessonIds = LessonExamQuestion::whereIn('lesson_id', $allLessonIds)
            ->pluck('lesson_id')
            ->unique();

        $modules = $course->modules->map(fn($m) => [
            'id'    => $m->id,
            'title' => $m->title,
            'exams' => $m->lessons
                ->filter(fn($l) => $examLessonIds->contains($l->id))
                ->map(fn($l) => ['id' => $l->id, 'title' => $l->title, 'pass_mark' => (int) $l->pass_mark])
                ->values(),
        ])->filter(fn($m) => $m['exams']->count() > 0)->values();

        if ($modules->isEmpty()) {
            return response()->json([
                'course'      => $course->only(['id', 'title']),
                'modules'     => [],
                'students'    => [],
                'exam_avgs'   => [],
                'module_avgs' => [],
                'course_avg'  => null,
            ]);
        }

        $examIds = $modules->flatMap(fn($m) => $m['exams']->pluck('id'))->values();

        // All approved enrollments with user info
        $enrollments = Enrollment::where('course_id', $course->id)
            ->where('status', 'approved')
            ->with('user:id,name,email')
            ->get();

        $enrolledUserIds = $enrollments->pluck('user_id')->filter()->unique();

        // Best score per (user, lesson) across all attempts
        $attemptsRaw = LessonExamAttempt::whereIn('lesson_id', $examIds)
            ->whereIn('user_id', $enrolledUserIds)
            ->selectRaw('user_id, lesson_id, MAX(score) as best_score, COUNT(*) as attempts_count,
                         MAX(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as ever_passed')
            ->groupBy('user_id', 'lesson_id')
            ->get()
            ->groupBy('user_id');

        $students = $enrollments->map(function ($enrollment) use ($attemptsRaw, $modules, $examIds) {
            $user = $enrollment->user;
            if (!$user) return null;

            $byLesson = $attemptsRaw->get($user->id, collect())->keyBy('lesson_id');

            $scores = [];
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

            $allScores = collect($scores)->filter()->map(fn($s) => $s['score']);
            $courseAvg = $allScores->isNotEmpty() ? round($allScores->avg(), 1) : null;

            return [
                'user_id'     => $user->id,
                'name'        => $user->name,
                'email'       => $user->email,
                'scores'      => $scores,
                'module_avgs' => $moduleAvgs,
                'course_avg'  => $courseAvg,
            ];
        })->filter()->values();

        // Class-level aggregates
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

        $allCourseAvgs = $students->map(fn($s) => $s['course_avg'])->filter();
        $courseAvg = $allCourseAvgs->isNotEmpty() ? round($allCourseAvgs->avg(), 1) : null;

        $modulesJson = $modules->map(fn($m) => array_merge($m, ['exams' => $m['exams']->values()->toArray()]))->values();

        return response()->json([
            'course'      => $course->only(['id', 'title']),
            'modules'     => $modulesJson,
            'students'    => $students,
            'exam_avgs'   => $examAvgs,
            'module_avgs' => $moduleAvgs,
            'course_avg'  => $courseAvg,
        ]);
    }
}
