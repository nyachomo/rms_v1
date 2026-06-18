<?php

namespace App\Http\Controllers;

use App\Models\ClassAssessment;
use App\Models\ClassAssessmentSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ClassAssessmentController extends Controller
{
    private function withRelations(): array
    {
        return ['techsphereClass:id,name', 'course:id,title,slug', 'module:id,title'];
    }

    // ─── Admin: List all assessments ────────────────────────────────────────

    public function adminIndex(Request $request): JsonResponse
    {
        $query = ClassAssessment::with($this->withRelations())
            ->withCount('submissions');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('title', 'like', "%{$s}%");
        }
        if ($request->filled('techsphere_class_id')) {
            $query->where('techsphere_class_id', $request->techsphere_class_id);
        }
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->input('per_page', 15), 200);

        return response()->json($query->orderByDesc('created_at')->paginate($perPage));
    }

    // ─── Admin: Create assessment ────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'               => 'required|string|max:255',
            'description'         => 'nullable|string',
            'techsphere_class_id' => 'nullable|exists:techsphere_classes,id',
            'course_id'           => 'nullable|exists:courses,id',
            'module_id'           => 'nullable|exists:course_modules,id',
            'due_date'            => 'nullable|date',
            'status'              => 'required|in:active,closed,draft',
        ]);

        $data['created_by'] = Auth::id();
        $assessment = ClassAssessment::create($data);

        return response()->json(['assessment' => $assessment->load($this->withRelations())], 201);
    }

    // ─── Admin: Update assessment ────────────────────────────────────────────

    public function update(Request $request, ClassAssessment $assessment): JsonResponse
    {
        $data = $request->validate([
            'title'               => 'required|string|max:255',
            'description'         => 'nullable|string',
            'techsphere_class_id' => 'nullable|exists:techsphere_classes,id',
            'course_id'           => 'nullable|exists:courses,id',
            'module_id'           => 'nullable|exists:course_modules,id',
            'due_date'            => 'nullable|date',
            'status'              => 'required|in:active,closed,draft',
        ]);

        $assessment->update($data);

        return response()->json(['assessment' => $assessment->fresh()->load($this->withRelations())]);
    }

    // ─── Admin: Delete assessment ────────────────────────────────────────────

    public function destroy(ClassAssessment $assessment): JsonResponse
    {
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

        $this->deleteFile($assessment->assessment_file_path);

        $file     = $request->file('file');
        $filename = uniqid('assess_') . '.' . $file->getClientOriginalExtension();
        $file->move(public_path('class-assessments'), $filename);

        $assessment->update([
            'assessment_file_path' => 'class-assessments/' . $filename,
            'assessment_file_name' => $file->getClientOriginalName(),
        ]);

        return response()->json(['assessment' => $assessment->fresh()->load($this->withRelations())]);
    }

    // ─── Admin: Remove assessment file ──────────────────────────────────────

    public function removeFile(ClassAssessment $assessment): JsonResponse
    {
        $this->deleteFile($assessment->assessment_file_path);

        $assessment->update([
            'assessment_file_path' => null,
            'assessment_file_name' => null,
        ]);

        return response()->json(['assessment' => $assessment->fresh()->load($this->withRelations())]);
    }

    // ─── Admin: List submissions for an assessment ──────────────────────────

    public function adminSubmissions(ClassAssessment $assessment): JsonResponse
    {
        $submissions = $assessment->submissions()
            ->with(['user:id,name,email', 'markedBy:id,name'])
            ->get();

        return response()->json([
            'assessment'  => $assessment->load($this->withRelations()),
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

    // ─── Admin: Mark submission (grade + optional file) ──────────────────────

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

        return response()->json(['submission' => $submission->fresh()->load(['user:id,name,email', 'markedBy:id,name'])]);
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

        return response()->json(['submission' => $submission->fresh()->load(['user:id,name,email', 'markedBy:id,name'])]);
    }

    // ─── Student: List assessments visible to this user ─────────────────────

    public function studentIndex(): JsonResponse
    {
        $userId = Auth::id();

        $enrolledClassIds = DB::table('techsphere_class_user')
            ->where('user_id', $userId)
            ->pluck('techsphere_class_id');

        $assessments = ClassAssessment::with($this->withRelations())
            ->where(function ($q) use ($enrolledClassIds) {
                $q->whereIn('techsphere_class_id', $enrolledClassIds)
                  ->orWhereNull('techsphere_class_id');
            })
            ->whereIn('status', ['active', 'closed'])
            ->orderByDesc('created_at')
            ->get();

        $assessments->each(function ($assessment) use ($userId) {
            $assessment->my_submission = $assessment->submissions()
                ->where('user_id', $userId)
                ->first();
        });

        return response()->json(['assessments' => $assessments]);
    }

    // ─── Student: Download assessment file ──────────────────────────────────

    public function studentDownload(ClassAssessment $assessment)
    {
        $this->authorizeStudentAccess($assessment);

        abort_if(!$assessment->assessment_file_path, 404, 'No file available for this assessment.');

        $path = public_path($assessment->assessment_file_path);
        abort_if(!file_exists($path), 404, 'File not found on server.');

        return response()->download($path, $assessment->assessment_file_name ?? basename($path));
    }

    // ─── Student: Submit work ────────────────────────────────────────────────

    public function studentSubmit(Request $request, ClassAssessment $assessment): JsonResponse
    {
        $this->authorizeStudentAccess($assessment);

        abort_if($assessment->status === 'closed', 403, 'This assessment is closed for submissions.');

        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip|max:20480',
        ]);

        $userId     = Auth::id();
        $submission = ClassAssessmentSubmission::firstOrNew([
            'assessment_id' => $assessment->id,
            'user_id'       => $userId,
        ]);

        if ($submission->exists) {
            $this->deleteFile($submission->submission_file_path);
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
        $this->authorizeStudentAccess($assessment);

        $submission = ClassAssessmentSubmission::where('assessment_id', $assessment->id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $this->deleteFile($submission->submission_file_path);
        $this->deleteFile($submission->marked_file_path);
        $submission->delete();

        return response()->json(['message' => 'Submission removed.']);
    }

    // ─── Student: Download marked file ──────────────────────────────────────

    public function studentDownloadMarked(ClassAssessment $assessment)
    {
        $submission = ClassAssessmentSubmission::where('assessment_id', $assessment->id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        abort_if(!$submission->marked_file_path, 404, 'No marked file available yet.');

        $path = public_path($submission->marked_file_path);
        abort_if(!file_exists($path), 404, 'File not found on server.');

        return response()->download($path, $submission->marked_file_name ?? basename($path));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function authorizeStudentAccess(ClassAssessment $assessment): void
    {
        if (is_null($assessment->techsphere_class_id)) return;

        $enrolled = DB::table('techsphere_class_user')
            ->where('user_id', Auth::id())
            ->where('techsphere_class_id', $assessment->techsphere_class_id)
            ->exists();

        abort_if(!$enrolled, 403, 'This assessment is not assigned to your class.');
    }

    private function deleteFile(?string $relativePath): void
    {
        if ($relativePath && file_exists(public_path($relativePath))) {
            @unlink(public_path($relativePath));
        }
    }
}
