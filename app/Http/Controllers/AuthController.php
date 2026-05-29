<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\User;
use App\Http\Controllers\RolePermissionController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|max:200|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => $this->userResource($user),
            'token' => $token,
        ], 201)->withCookie($this->tokenCookie($token));
    }

    /**
     * Log in an existing user.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();

        if ($user->status === 'suspended') {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => ['Your account has been suspended. Please contact the administrator.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => $this->userResource($user),
            'token' => $token,
        ])->withCookie($this->tokenCookie($token));
    }

    /**
     * Return the authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->status === 'suspended') {
            $user->tokens()->delete();
            return response()->json(['message' => 'Your account has been suspended.', 'suspended' => true], 403);
        }

        return response()->json([
            'user' => $this->userResource($user),
        ]);
    }

    /**
     * Update the authenticated user's profile (name & email).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => 'required|string|max:100',
            'email' => 'required|email|max:200|unique:users,email,' . $user->id,
        ]);

        $user->update($validated);

        return response()->json([
            'user'    => $this->userResource($user->fresh()),
            'message' => 'Profile updated successfully.',
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Revoke all tokens so other sessions are invalidated
        $user->tokens()->delete();

        // Issue a fresh token for the current session
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token'   => $token,
            'message' => 'Password changed successfully.',
        ])->withCookie($this->tokenCookie($token));
    }

    /**
     * Revoke the current token (logout).
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Logged out successfully.'])
            ->withCookie(Cookie::forget('api_token'));
    }

    /**
     * Upload or replace the authenticated user's profile photo.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $user = $request->user();

        // Delete old avatar file if one was previously stored
        if ($user->user_image) {
            $oldFile = public_path($user->user_image);
            if (file_exists($oldFile)) {
                @unlink($oldFile);
            }
        }

        // Store directly in public/avatars/ so Apache serves it without symlinks
        $file     = $request->file('avatar');
        $filename = uniqid('av_', true) . '.' . $file->getClientOriginalExtension();
        $file->move(public_path('avatars'), $filename);

        $user->update(['user_image' => 'avatars/' . $filename]);

        return response()->json([
            'user'    => $this->userResource($user->fresh()),
            'message' => 'Profile photo updated.',
        ]);
    }

    /** Return the student record linked to the authenticated user. */
    public function studentInfo(Request $request): JsonResponse
    {
        $user    = $request->user();
        $student = $user->student()->with(['schoolClass', 'programEvent'])->first();

        // All enrollments with course + intake + class
        $enrollments = \App\Models\Enrollment::where('user_id', '=', $user->id)
            ->with(['course:id,title', 'intake:id,intake_name', 'schoolClass:id,name'])
            ->get(['id', 'course_id', 'intake_id', 'class_id', 'status']);

        return response()->json([
            'student'     => $student,
            'enrollments' => $enrollments->map(fn($e) => [
                'course' => $e->course?->title,
                'intake' => $e->intake?->intake_name,
                'class'  => $e->schoolClass?->name,
                'status' => $e->status,
            ])->values(),
        ]);
    }

    /** Update personal + parent details for the authenticated user's student record. */
    public function updateStudentInfo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone'               => 'nullable|string|max:30',
            'gender'              => 'nullable|in:male,female,other',
            'date_of_birth'       => 'nullable|date',
            'address'             => 'nullable|string|max:500',
            'parent_name'         => 'nullable|string|max:200',
            'parent_phone'        => 'nullable|string|max:30',
            'parent_email'        => 'nullable|email|max:200',
            'parent_relationship' => 'nullable|string|max:50',
        ]);

        $user    = $request->user();
        $student = $user->student;

        if ($student) {
            $student->update($validated);
        } else {
            Student::create(array_merge($validated, [
                'user_id' => $user->id,
                'name'    => $user->name,
                'email'   => $user->email,
            ]));
        }

        return response()->json([
            'student' => $user->fresh()->student,
            'message' => 'Details updated successfully.',
        ]);
    }

    // Builds the HttpOnly cookie that carries the Sanctum token.
    // Apache never strips cookies, so FixAuthorizationHeader can always read it
    // on cPanel even when the Authorization header gets stripped.
    private function tokenCookie(string $token): \Symfony\Component\HttpFoundation\Cookie
    {
        return cookie(
            'api_token',
            $token,
            60 * 24 * 7,         // 7 days
            '/',
            null,                // domain — null = current host
            request()->isSecure(), // Secure flag only on HTTPS
            true,                // HttpOnly — JS cannot read it (XSS-safe)
            false,
            'Lax'
        );
    }

    private function userResource(User $user): array
    {
        $user->loadMissing('role.permissions');

        // Build permissions map { module: { action: bool } }
        $moduleActions = RolePermissionController::MODULE_ACTIONS;
        $permissions   = null; // null means super-admin (no role = full access)

        if ($user->role_id) {
            foreach ($moduleActions as $module => $actions) {
                foreach ($actions as $action) {
                    $permissions[$module][$action] = false;
                }
            }
            foreach ($user->role->permissions as $perm) {
                if (isset($permissions[$perm->module][$perm->action])) {
                    $permissions[$perm->module][$perm->action] = true;
                }
            }
        }

        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role_id'     => $user->role_id,
            'role'        => $user->role ? ['id' => $user->role->id, 'name' => $user->role->name] : null,
            'status'      => $user->status,
            'user_image'  => $user->user_image ? asset($user->user_image) : null,
            'permissions' => $permissions,
        ];
    }
}
