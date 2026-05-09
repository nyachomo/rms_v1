<?php

namespace App\Http\Controllers;

use App\Models\TechsphereClass;
use App\Models\User;
use App\Services\ZoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TechsphereClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TechsphereClass::with(['teachers:id,name,email'])->withCount('enrolledUsers');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name',  'like', "%{$search}%")
                  ->orWhere('venue', 'like', "%{$search}%")
                  ->orWhereHas('teachers', fn ($t) => $t->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $perPage = (int) ($request->input('per_page') ?? 15);
        if ($perPage < 1 || $perPage > 500) $perPage = 15;
        $data    = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'data' => $data->items(),
            'meta' => [
                'total'     => $data->total(),
                'last_page' => $data->lastPage(),
                'page'      => $data->currentPage(),
                'per_page'  => $data->perPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:200|unique:techsphere_classes,name',
            'description'   => 'nullable|string',
            'capacity'      => 'nullable|integer|min:1',
            'venue'         => 'nullable|string|max:200',
            'status'        => 'in:active,archived',
            'teacher_ids'   => 'nullable|array',
            'teacher_ids.*' => 'integer|exists:teachers,id',
        ]);

        $validated['status'] = $validated['status'] ?? 'active';
        $teacherIds = $validated['teacher_ids'] ?? [];
        unset($validated['teacher_ids']);

        $class = TechsphereClass::create($validated);
        $class->teachers()->sync($teacherIds);

        return response()->json($class->load('teachers:id,name,email'), 201);
    }

    public function update(Request $request, TechsphereClass $techsphereClass): JsonResponse
    {
        $validated = $request->validate([
            'name'          => "required|string|max:200|unique:techsphere_classes,name,{$techsphereClass->id}",
            'description'   => 'nullable|string',
            'capacity'      => 'nullable|integer|min:1',
            'venue'         => 'nullable|string|max:200',
            'status'        => 'in:active,archived',
            'teacher_ids'   => 'nullable|array',
            'teacher_ids.*' => 'integer|exists:teachers,id',
        ]);

        $teacherIds = $validated['teacher_ids'] ?? [];
        unset($validated['teacher_ids']);

        $techsphereClass->update($validated);
        $techsphereClass->teachers()->sync($teacherIds);

        $techsphereClass->refresh();
        $techsphereClass->load('teachers:id,name,email');

        return response()->json($techsphereClass);
    }

    /* Returns all users whose role name contains "student" */
    public function studentRoleUsers(): JsonResponse
    {
        $users = User::whereHas('role', fn ($q) => $q->where('name', 'like', '%student%'))
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json($users);
    }

    /* Returns users already enrolled in this class */
    public function enrolledStudents(TechsphereClass $techsphereClass): JsonResponse
    {
        $users = $techsphereClass->enrolledUsers()
            ->select('users.id', 'users.name', 'users.email')
            ->orderBy('users.name')
            ->get();

        return response()->json($users);
    }

    /* Syncs enrolled users for this class */
    public function syncStudents(Request $request, TechsphereClass $techsphereClass): JsonResponse
    {
        $request->validate([
            'student_ids'   => 'nullable|array',
            'student_ids.*' => 'integer|exists:users,id',
        ]);

        $techsphereClass->enrolledUsers()->sync($request->input('student_ids', []));

        $count = $techsphereClass->enrolledUsers()->count();

        return response()->json(['enrolled' => $count, 'message' => "Class now has {$count} enrolled student(s)."]);
    }

    public function destroy(TechsphereClass $techsphereClass): JsonResponse
    {
        $techsphereClass->teachers()->detach();
        $techsphereClass->enrolledUsers()->detach();
        $techsphereClass->deleteOrFail();

        return response()->json(['message' => 'Techsphere class deleted successfully.']);
    }

    /* ── Zoom: create a meeting for this class ── */
    public function createMeeting(TechsphereClass $techsphereClass): JsonResponse
    {
        if ($techsphereClass->zoom_meeting_id) {
            return response()->json(['message' => 'Meeting already exists for this class.'], 409);
        }

        $zoom    = new ZoomService();
        $meeting = $zoom->createMeeting($techsphereClass->name);

        if (empty($meeting['id'])) {
            $zoomError = $meeting['message'] ?? ($meeting['reason'] ?? 'Unknown Zoom API error');
            return response()->json(['message' => "Zoom API error: {$zoomError}", 'zoom_response' => $meeting], 502);
        }

        $techsphereClass->update([
            'zoom_meeting_id' => (string) $meeting['id'],
            'zoom_join_url'   => $meeting['join_url']   ?? null,
            'zoom_start_url'  => $meeting['start_url']  ?? null,
            'zoom_password'   => $meeting['password']   ?? null,
        ]);

        return response()->json($techsphereClass->fresh());
    }

    /* ── Zoom: delete the meeting for this class ── */
    public function deleteMeeting(TechsphereClass $techsphereClass): JsonResponse
    {
        if (!$techsphereClass->zoom_meeting_id) {
            return response()->json(['message' => 'No meeting found for this class.'], 404);
        }

        $zoom = new ZoomService();
        $zoom->deleteMeeting($techsphereClass->zoom_meeting_id);

        $techsphereClass->update([
            'zoom_meeting_id' => null,
            'zoom_join_url'   => null,
            'zoom_start_url'  => null,
            'zoom_password'   => null,
        ]);

        return response()->json(['message' => 'Zoom meeting removed.']);
    }

    /* ── Zoom: generate SDK signature so the browser can join the meeting ── */
    public function meetingSignature(Request $request, TechsphereClass $techsphereClass): JsonResponse
    {
        if (!$techsphereClass->zoom_meeting_id) {
            return response()->json(['message' => 'No meeting found for this class.'], 404);
        }

        $role      = (int) $request->input('role', 0); // 0 = attendee, 1 = host
        $zoom      = new ZoomService();
        $signature = $zoom->generateSignature($techsphereClass->zoom_meeting_id, $role);

        return response()->json([
            'signature'      => $signature,
            'sdk_key'        => $zoom->getSdkKey(),
            'meeting_number' => $techsphereClass->zoom_meeting_id,
            'password'       => $techsphereClass->zoom_password,
            'host_email'     => $zoom->getHostEmail(),
        ]);
    }
}
