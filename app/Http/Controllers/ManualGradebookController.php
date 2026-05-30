<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseAssessment;
use App\Models\CourseAssessmentScore;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManualGradebookController extends Controller
{
    /** All courses with their category — for the course selector */
    public function courses(): JsonResponse
    {
        $courses = Course::with('courseCategory:id,name')
            ->orderBy('title')
            ->get(['id', 'title', 'slug', 'category_id']);

        return response()->json($courses);
    }

    /** List all assessments for a course */
    public function index(Course $course): JsonResponse
    {
        $assessments = $course->assessments()->orderBy('sort_order')->orderBy('id')->get();
        return response()->json($assessments);
    }

    /** Create a new assessment for a course */
    public function store(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:200',
            'max_score'  => 'required|numeric|min:1|max:9999',
            'sort_order' => 'nullable|integer',
        ]);

        $data['course_id']   = $course->id;
        $data['sort_order'] ??= $course->assessments()->max('sort_order') + 1;

        $assessment = CourseAssessment::create($data);
        return response()->json($assessment, 201);
    }

    /** Update an assessment's name or max_score */
    public function update(Request $request, CourseAssessment $assessment): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'required|string|max:200',
            'max_score' => 'required|numeric|min:1|max:9999',
        ]);

        $assessment->update($data);
        return response()->json($assessment->fresh());
    }

    /** Delete an assessment (cascades scores) */
    public function destroy(CourseAssessment $assessment): JsonResponse
    {
        $assessment->delete();
        return response()->json(['message' => 'Assessment deleted.']);
    }

    /** Full grid: enrolled students × all assessments with their scores */
    public function grid(Course $course): JsonResponse
    {
        $assessments = $course->assessments()->orderBy('sort_order')->orderBy('id')->get();

        $enrollments = Enrollment::where('course_id', $course->id)
            ->where('status', 'approved')
            ->with('user:id,name,email')
            ->get();

        $assessmentIds = $assessments->pluck('id');

        $scoresRaw = CourseAssessmentScore::whereIn('assessment_id', $assessmentIds)
            ->whereIn('user_id', $enrollments->pluck('user_id')->filter())
            ->get()
            ->groupBy('user_id');

        $students = $enrollments->map(function ($e) use ($scoresRaw, $assessments) {
            $user = $e->user;
            if (!$user) return null;

            $scores = [];
            foreach ($assessments as $a) {
                $s = $scoresRaw->get($user->id, collect())->firstWhere('assessment_id', $a->id);
                $scores[$a->id] = $s ? (float) $s->score : null;
            }

            $attempted   = collect($scores)->filter(fn($v) => $v !== null);
            $courseAvg   = $attempted->isNotEmpty()
                ? round($attempted->avg(), 1)
                : null;

            return [
                'user_id'    => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'scores'     => $scores,
                'average'    => $courseAvg,
            ];
        })->filter()->values();

        // Class averages per assessment
        $classAvgs = [];
        foreach ($assessments as $a) {
            $vals = $students->map(fn($s) => $s['scores'][$a->id])->filter();
            $classAvgs[$a->id] = $vals->isNotEmpty() ? round($vals->avg(), 1) : null;
        }

        $overallAvg = $students->map(fn($s) => $s['average'])->filter();

        return response()->json([
            'course'      => $course->only(['id', 'title']),
            'assessments' => $assessments->values(),
            'students'    => $students,
            'class_avgs'  => $classAvgs,
            'overall_avg' => $overallAvg->isNotEmpty() ? round($overallAvg->avg(), 1) : null,
        ]);
    }

    /** Save or update a single student's score for an assessment */
    public function saveScore(Request $request, CourseAssessment $assessment, User $user): JsonResponse
    {
        $data = $request->validate([
            'score' => 'required|numeric|min:0|max:' . $assessment->max_score,
        ]);

        CourseAssessmentScore::updateOrCreate(
            ['assessment_id' => $assessment->id, 'user_id' => $user->id],
            ['score' => $data['score']]
        );

        return response()->json(['message' => 'Score saved.', 'score' => (float) $data['score']]);
    }

    /** Delete a single student's score */
    public function deleteScore(CourseAssessment $assessment, User $user): JsonResponse
    {
        CourseAssessmentScore::where('assessment_id', $assessment->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['message' => 'Score cleared.']);
    }
}
