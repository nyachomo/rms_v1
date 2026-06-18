<?php

namespace App\Http\Controllers;

use App\Models\ClassAssessment;
use App\Models\ClassAssessmentSubmission;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ClassAssessmentController extends Controller
{
    // ─── Admin: List all assessments ────────────────────────────────────────

    public function adminIndex(Request $request): JsonResponse
    {
        $query = ClassAssessment::with(['schoolClass', 'creator'])
            ->withCount('submissions');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('title', 'like', "%{$s}%");
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) ($request->get('per_page', 15)), 200);

        return response()->json($query->orderByDesc('created_at')->paginate($perPage));
    }

    // ─── Admin: Create assessment ────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'class_id'    => 'nullable|exists:school_classes,id',
            'due_date'    => 'nullable|date',
            'status'      => 'required|in:active,closed,draft',
        ]);

        $data['created_by'] = Auth::id();

        $assessment = ClassAssessment::create($data);

        return response()->json(['assessment' => $assessment->load('schoolClass')], 201);
    }

    // ─── Admin: Update assessment ────────────────────────────────────────────

    public function update(Request $request, ClassAssessment $assessment): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'class_id'    => 'nullable|exists:school_classes,id',
            'due_date'    => 'nullable|date',
            'status'      => 'required|in:active,closed,draft',
        ]);

        $assessment->update($data);

        return response()->json(['assessment' => $assessment->fresh()->load('schoolClass')]);
    }

    // ─── Admin: Delete assessment ────────────────────────────────────────────

    public function destroy(ClassAssessment $assessment): JsonResponse
    {
        // Remove uploaded files from disk
        $this->deleteFile($assessment->assessment_file_path);

        foreach ($assessment->submissions as $sub) {
            $this->deleteFile($sub->submission_file_path);
            $this->deleteFile($sub->marked_file_path);
        }

        $assessment->delete();

        return response()->json(['message' => 'Assessment deleted.']);
    }

    // ─── Admin: Upload assessment file ───────────────────────────────────────

    public function uploadFile(Request $request, ClassAssessment $assessment): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip|max:20480',
        ]);

        // Remove old file if exists
        $this->deleteFile($assessment->assessment_file_path);

        $file     = $request->file('file');
        $filename = uniqid('assess_') . '.' . $file->getClientOriginalExtension();
        $file->move(public_path('class-assessments'), $filename);

        $assessment->update([
            'assessment_file_path' => 'class-assessments/' . $filename,
            'assessment_file_name' => $file->getClientOriginalName(),
        ]);

        return response()->json(['assessment' => $assessment->fresh()->load('schoolClass')]);
    }

    // ─── Admin: Remove assessment file ──────────────────────────────────────

    public function removeFile(ClassAssessment $assessment): JsonResponse
    {
        $this->deleteFile($assessment->assessment_file_path);

        $assessment->update([
            'assessment_file_path' => null,
            'assessment_file_name' => null,
        ]);

        return response()->json(['assessment' => $assessment->fresh()->load('schoolClass')]);
    }

    // ─── Admin: List submissions for an assessment ──────────────────────────

    public function adminSubmissions(Request $request, ClassAssessment $assessment): JsonResponse
    {
        $submissions = $assessment->submissions()
            ->with(['student.user', 'markedBy'])
            ->get();

        return response()->json([
            'assessment'  => $assessment->load('schoolClass'),
            'submissions' => $submissions,
        ]);
    }

    // ─── Admin: Download a student's submission ──────────────────────────────

    public function downloadSubmission(ClassAssessment $assessment, ClassAssessmentSubmission $submission)
    {
        abort_if($submission->assessment_id !== $assessment->id, 404);
        abort_if(!$submission->submission_file_path, 404, 'No file uploaded yet.');

        $path = public_path($submission->submission_file_path);
        abort_if(!file_exists($path), 404, 'File not found on server.');

        return response()->download($path, $submission->submission_file_name ?? basename($path));
    }

    // ─── Admin: Upload marked file + grade/feedback ──────────────────────────

    public function markSubmission(Request $request, ClassAssessment $assessment, ClassAssessmentSubmission $submission): JsonResponse
    {
        abort_if($submission->assessment_id !== $assessment->id, 404);

        $data = $request->validate([
            'grade'    => 'nullable|string|max:50',
            'feedback' => 'nullable|string',
            'file'     => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip|max:20480',
        ]);

        $update = [
            'grade'     => $data['grade'] ?? $submission->grade,
            'feedback'  => $data['feedback'] ?? $submission->feedback,
            'status'    => 'graded',
            'marked_by' => Auth::id(),
            'marked_at' => now(),
        ];

        if ($request->hasFile('file')) {
            $this->deleteFile($submission->marked_file_path);

            $file     = $request->file('file');
            $filename = uniqid('marked_') . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('class-assessments/marked'), $filename);

            $update['marked_file_path'] = 'class-assessments/marked/' . $filename;
            $update['marked_file_name'] = $file->getClientOriginalName();
        }

        $submission->update($update);

        return response()->json(['submission' => $submission->fresh()->load(['student.user', 'markedBy'])]);
    }

    // ─── Admin: Remove marked file ───────────────────────────────────────────

    public function removeMarkedFile(ClassAssessment $assessment, ClassAssessmentSubmission $submission): JsonResponse
    {
        abort_if($submission->assessment_id !== $assessment->id, 404);

        $this->deleteFile($submission->marked_file_path);

        $submission->update([
            'marked_file_path' => null,
            'marked_file_name' => null,
        ]);

        return response()->json(['submission' => $submission->fresh()->load(['student.user', 'markedBy'])]);
    }

    // ─── Student: List assessments for their class ───────────────────────────

    public function studentIndex(): JsonResponse
    {
        $student = $this->getAuthStudent();

        $assessments = ClassAssessment::with('schoolClass')
            ->where(function ($q) use ($student) {
                $q->where('class_id', $student->class_id)
                  ->orWhereNull('class_id');
            })
            ->whereIn('status', ['active', 'closed'])
            ->orderByDesc('created_at')
            ->get();

        // Attach this student's submission info to each assessment
        $assessments->each(function ($assessment) use ($student) {
            $submission = $assessment->submissions()
                ->where('student_id', $student->id)
                ->first();
            $assessment->my_submission = $submission;
        });

        return response()->json(['assessments' => $assessments]);
    }

    // ─── Student: Download assessment file ──────────────────────────────────

    public function studentDownload(ClassAssessment $assessment)
    {
        $student = $this->getAuthStudent();
        $this->authorizeStudentAccess($assessment, $student);

        abort_if(!$assessment->assessment_file_path, 404, 'No file available for this assessment.');

        $path = public_path($assessment->assessment_file_path);
        abort_if(!file_exists($path), 404, 'File not found on server.');

        return response()->download($path, $assessment->assessment_file_name ?? basename($path));
    }

    // ─── Student: Submit work ────────────────────────────────────────────────

    public function studentSubmit(Request $request, ClassAssessment $assessment): JsonResponse
    {
        $student = $this->getAuthStudent();
        $this->authorizeStudentAccess($assessment, $student);

        abort_if($assessment->status === 'closed', 403, 'This assessment is closed for submissions.');

        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip|max:20480',
        ]);

        $submission = ClassAssessmentSubmission::firstOrNew([
            'assessment_id' => $assessment->id,
            'student_id'    => $student->id,
        ]);

        // Remove old submission file if re-submitting
        if ($submission->exists) {
            $this->deleteFile($submission->submission_file_path);
            // Reset grading when re-submitting
            $submission->fill([
                'grade'            => null,
                'feedback'         => null,
                'marked_file_path' => null,
                'marked_file_name' => null,
                'marked_by'        => null,
                'marked_at'        => null,
            ]);
        }

        $file     = $request->file('file');
        $filename = uniqid('sub_') . '.' . $file->getClientOriginalExtension();
        $file->move(public_path('class-assessments/submissions'), $filename);

        $submission->fill([
            'submission_file_path' => 'class-assessments/submissions/' . $filename,
            'submission_file_name' => $file->getClientOriginalName(),
            'submitted_at'         => now(),
            'status'               => 'submitted',
        ]);
        $submission->save();

        return response()->json(['submission' => $submission->fresh()]);
    }

    // ─── Student: Delete own submission ──────────────────────────────────────

    public function studentDeleteSubmission(ClassAssessment $assessment): JsonResponse
    {
        $student = $this->getAuthStudent();
        $this->authorizeStudentAccess($assessment, $student);

        $submission = ClassAssessmentSubmission::where('assessment_id', $assessment->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $this->deleteFile($submission->submission_file_path);
        $this->deleteFile($submission->marked_file_path);
        $submission->delete();

        return response()->json(['message' => 'Submission removed.']);
    }

    // ─── Student: Download marked file ──────────────────────────────────────

    public function studentDownloadMarked(ClassAssessment $assessment)
    {
        $student = $this->getAuthStudent();

        $submission = ClassAssessmentSubmission::where('assessment_id', $assessment->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        abort_if(!$submission->marked_file_path, 404, 'No marked file available yet.');

        $path = public_path($submission->marked_file_path);
        abort_if(!file_exists($path), 404, 'File not found on server.');

        return response()->download($path, $submission->marked_file_name ?? basename($path));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function getAuthStudent(): Student
    {
        $student = Student::where('user_id', Auth::id())->first();
        abort_if(!$student, 403, 'No student profile found for this account.');
        return $student;
    }

    private function authorizeStudentAccess(ClassAssessment $assessment, Student $student): void
    {
        $allowed = is_null($assessment->class_id) || $assessment->class_id === $student->class_id;
        abort_if(!$allowed, 403, 'This assessment is not assigned to your class.');
    }

    private function deleteFile(?string $relativePath): void
    {
        if ($relativePath && file_exists(public_path($relativePath))) {
            @unlink(public_path($relativePath));
        }
    }
}
