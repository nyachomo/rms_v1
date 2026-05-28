<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseLesson;
use App\Models\Enrollment;
use App\Models\LessonExamAttempt;
use App\Models\LessonExamQuestion;
use App\Models\StudentProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LearningController extends Controller
{
    /** Check if the authenticated user has a specific learning permission */
    private function hasLearningPermission(string $action): bool
    {
        $user = Auth::user();
        if (!$user) return false;
        if ($user->role_id === null) return true; // super-admin
        $user->loadMissing('role.permissions');
        return $user->role && $user->role->permissions
            ->where('module', 'learning')
            ->where('action', $action)
            ->isNotEmpty();
    }

    /** Student's enrolled + approved courses with progress stats */
    public function myCourses(): JsonResponse
    {
        if (!$this->hasLearningPermission('view')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $userId = Auth::id();

        $enrollments = Enrollment::where('user_id', $userId)
            ->where('status', 'approved')
            ->with(['course:id,title,slug,image_url,icon,icon_class,category,duration,level'])
            ->get();

        $courseIds = $enrollments->pluck('course.id')->filter()->values();

        // Batch-fetch all exam lessons (with questions) across enrolled courses
        $examLessons = CourseLesson::whereIn('course_id', $courseIds)
            ->where('status', 'published')
            ->whereNotNull('pass_mark')
            ->whereHas('examQuestions')
            ->select('id', 'course_id')
            ->get();

        $examLessonIds  = $examLessons->pluck('id');
        $lessonToCourse = $examLessons->pluck('course_id', 'id'); // lesson_id → course_id

        // Best score per lesson for this student
        $bestScores = $examLessonIds->isNotEmpty()
            ? LessonExamAttempt::where('user_id', $userId)
                ->whereIn('lesson_id', $examLessonIds)
                ->selectRaw('lesson_id, MAX(score) as best_score')
                ->groupBy('lesson_id')
                ->get()
                ->keyBy('lesson_id')
            : collect();

        // Aggregate: avg of best scores per course
        $scoresByCourse = [];
        foreach ($lessonToCourse as $lessonId => $courseId) {
            if ($bestScores->has($lessonId)) {
                $scoresByCourse[$courseId][] = (float) $bestScores[$lessonId]->best_score;
            }
        }
        $courseAvgScores = collect($scoresByCourse)->map(
            fn($s) => count($s) > 0 ? round(array_sum($s) / count($s), 1) : null
        );

        // How many exam lessons per course (to show "X assessments")
        $examCountByCourse = $examLessons->groupBy('course_id')->map->count();

        $result = $enrollments->map(function ($enrollment) use ($userId, $courseAvgScores, $examCountByCourse) {
            $course = $enrollment->course;
            if (!$course) return null;

            try {
                $totalLessons = $course->lessons()->where('status', 'published')->count();
            } catch (\Exception $e) {
                $totalLessons = 0;
            }

            try {
                $completedLessons = StudentProgress::whereHas('lesson', fn($q) => $q->where('course_id', $course->id))
                    ->where('user_id', $userId)
                    ->whereNotNull('completed_at')
                    ->count();
            } catch (\Exception $e) {
                $completedLessons = 0;
            }

            return [
                'enrollment_id'    => $enrollment->id,
                'course'           => $course,
                'total_lessons'    => $totalLessons,
                'completed_lessons'=> $completedLessons,
                'progress_percent' => $totalLessons > 0 ? round(($completedLessons / $totalLessons) * 100) : 0,
                'enrolled_at'      => $enrollment->created_at,
                'avg_exam_score'   => $courseAvgScores[$course->id] ?? null,
                'exam_count'       => $examCountByCourse[$course->id] ?? 0,
            ];
        })->filter()->values();

        return response()->json($result);
    }

    /** Modules + lessons for a specific course (must be approved-enrolled) */
    public function courseLessons(string $slug): JsonResponse
    {
        if (!$this->hasLearningPermission('view') && !$this->hasLearningPermission('manage')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $userId = Auth::id();
        $course = Course::where('slug', $slug)->firstOrFail();

        $isEnrolled = Enrollment::where('user_id', $userId)
            ->where('course_id', $course->id)
            ->where('status', 'approved')
            ->exists();

        $hasAdminAccess = $this->hasLearningPermission('manage');

        if (!$isEnrolled && !$hasAdminAccess) {
            return response()->json(['message' => 'You are not enrolled in this course.'], 403);
        }

        $modules = $course->modules()
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->with(['lessons' => fn($q) => $q->where('status', 'published')->orderBy('sort_order')
                ->select('id', 'module_id', 'course_id', 'title', 'type', 'duration_minutes', 'sort_order', 'status', 'video_url', 'content', 'pass_mark')])
            ->get(['id', 'course_id', 'title', 'description', 'sort_order']);

        $allLessonIds = $modules->flatMap(fn($m) => $m->lessons->pluck('id'));

        // Completed lessons
        $completedIds = StudentProgress::where('user_id', $userId)
            ->whereIn('lesson_id', $allLessonIds)
            ->whereNotNull('completed_at')
            ->pluck('lesson_id')
            ->toArray();

        // Exam question counts per lesson
        $examQuestionCounts = LessonExamQuestion::whereIn('lesson_id', $allLessonIds)
            ->selectRaw('lesson_id, count(*) as cnt')
            ->groupBy('lesson_id')
            ->pluck('cnt', 'lesson_id');

        // Lessons where this student has a passing attempt
        $passedLessonIds = LessonExamAttempt::where('user_id', $userId)
            ->whereIn('lesson_id', $allLessonIds)
            ->where('passed', true)
            ->pluck('lesson_id')
            ->unique()
            ->toArray();

        // Lessons where this student has ANY attempt (for one-attempt-only enforcement)
        $attemptedLessonIds = LessonExamAttempt::where('user_id', $userId)
            ->whereIn('lesson_id', $allLessonIds)
            ->pluck('lesson_id')
            ->unique()
            ->toArray();

        $modules = $modules->map(fn($m) => [
            'id'          => $m->id,
            'title'       => $m->title,
            'description' => $m->description,
            'sort_order'  => $m->sort_order,
            'lessons'     => $m->lessons->map(fn($l) => array_merge($l->toArray(), [
                'completed'      => in_array($l->id, $completedIds),
                // has_exam = pass_mark is set AND at least one question exists
                'has_exam'       => !is_null($l->pass_mark) && ($examQuestionCounts[$l->id] ?? 0) > 0,
                'exam_passed'    => in_array($l->id, $passedLessonIds),
                'exam_attempted' => in_array($l->id, $attemptedLessonIds),
            ])),
        ]);

        return response()->json([
            'course'  => $course->only(['id', 'title', 'slug', 'image_url', 'icon', 'icon_class', 'category', 'duration']),
            'modules' => $modules,
        ]);
    }

    /** Mark a lesson complete (manual, only allowed when no exam or exam is passed) */
    public function markComplete(CourseLesson $lesson): JsonResponse
    {
        if (!$this->hasLearningPermission('view')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $userId = Auth::id();

        // Block manual completion if lesson has an exam the student hasn't passed yet
        if (!is_null($lesson->pass_mark)) {
            $passed = LessonExamAttempt::where('user_id', $userId)
                ->where('lesson_id', $lesson->id)
                ->where('passed', true)
                ->exists();

            if (!$passed) {
                return response()->json(['message' => 'You must pass the lesson exam before marking it complete.'], 403);
            }
        }

        StudentProgress::updateOrCreate(
            ['user_id' => $userId, 'lesson_id' => $lesson->id],
            ['completed_at' => now()]
        );

        return response()->json(['message' => 'Lesson marked as complete.', 'lesson_id' => $lesson->id]);
    }

    /** Student's best exam scores, grouped by course → module → lesson */
    public function myScores(): JsonResponse
    {
        if (!$this->hasLearningPermission('view_scores')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $userId = Auth::id();

        $enrollments = Enrollment::where('user_id', $userId)
            ->where('status', 'approved')
            ->with(['course.modules' => fn($q) => $q
                ->where('status', 'active')
                ->orderBy('sort_order')
                ->with(['lessons' => fn($q) => $q
                    ->where('status', 'published')
                    ->whereNotNull('pass_mark')
                    ->orderBy('sort_order')
                    ->select('id', 'module_id', 'course_id', 'title', 'pass_mark', 'sort_order'),
                ]),
            ])
            ->get();

        // Collect all lesson IDs that have exams across enrolled courses
        $allLessonIds = $enrollments->flatMap(fn($e) =>
            $e->course?->modules->flatMap(fn($m) => $m->lessons->pluck('id')) ?? []
        );

        // Confirm which lessons actually have questions set up
        $questionCounts = LessonExamQuestion::whereIn('lesson_id', $allLessonIds)
            ->selectRaw('lesson_id, count(*) as cnt')
            ->groupBy('lesson_id')
            ->pluck('cnt', 'lesson_id');

        // Best score + total attempts per lesson for this student
        $bestAttempts = LessonExamAttempt::where('user_id', $userId)
            ->whereIn('lesson_id', $allLessonIds)
            ->selectRaw('lesson_id, MAX(score) as best_score, COUNT(*) as attempts_count, CAST(MAX(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS UNSIGNED) as passed, MAX(created_at) as last_at')
            ->groupBy('lesson_id')
            ->get()
            ->keyBy('lesson_id');

        $result = $enrollments->map(function ($enrollment) use ($questionCounts, $bestAttempts) {
            $course = $enrollment->course;
            if (!$course) return null;

            $modulesData = $course->modules->map(function ($module) use ($questionCounts, $bestAttempts) {
                $lessonsData = $module->lessons
                    ->filter(fn($l) => ($questionCounts[$l->id] ?? 0) > 0)
                    ->map(function ($lesson) use ($bestAttempts) {
                        $a = $bestAttempts[$lesson->id] ?? null;
                        return [
                            'lesson_id'       => $lesson->id,
                            'lesson_title'    => $lesson->title,
                            'pass_mark'       => $lesson->pass_mark,
                            'best_score'      => $a ? round((float) $a->best_score, 1) : null,
                            'attempts_count'  => $a ? (int) $a->attempts_count : 0,
                            'passed'          => $a ? (bool) $a->passed : false,
                            'last_attempt_at' => $a?->last_at,
                        ];
                    })->values();

                $attempted   = $lessonsData->filter(fn($l) => $l['best_score'] !== null);
                $moduleAvg   = $attempted->count() > 0 ? round($attempted->avg('best_score'), 1) : null;

                return [
                    'module_id'    => $module->id,
                    'module_title' => $module->title,
                    'avg_score'    => $moduleAvg,
                    'exam_count'   => $lessonsData->count(),
                    'passed_count' => $lessonsData->filter(fn($l) => $l['passed'])->count(),
                    'lessons'      => $lessonsData,
                ];
            })->filter(fn($m) => $m['exam_count'] > 0)->values();

            $withScores = $modulesData->filter(fn($m) => $m['avg_score'] !== null);
            $courseAvg  = $withScores->count() > 0 ? round($withScores->avg('avg_score'), 1) : null;

            return [
                'course_id'    => $course->id,
                'course_title' => $course->title,
                'course_slug'  => $course->slug,
                'avg_score'    => $courseAvg,
                'total_exams'  => $modulesData->sum('exam_count'),
                'total_passed' => $modulesData->sum('passed_count'),
                'modules'      => $modulesData,
            ];
        })->filter(fn($c) => $c && $c['total_exams'] > 0)->values();

        return response()->json($result);
    }

    /** All enrollments for the authenticated user (any status) */
    public function myEnrollments(): JsonResponse
    {
        $enrollments = Enrollment::where('user_id', Auth::id())
            ->select('id', 'course_id', 'intake_id', 'status', 'created_at')
            ->get();

        return response()->json($enrollments);
    }

    /** Unmark a lesson */
    public function unmarkComplete(CourseLesson $lesson): JsonResponse
    {
        if (!$this->hasLearningPermission('view')) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        StudentProgress::where('user_id', Auth::id())
            ->where('lesson_id', $lesson->id)
            ->delete();

        return response()->json(['message' => 'Lesson unmarked.', 'lesson_id' => $lesson->id]);
    }
}
