<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    /** Human-readable module names */
    public const MODULES = [
        // Dashboard
        'dashboard'         => 'Dashboard',
        // People
        'students'          => 'Students',
        'teachers'          => 'Teachers',
        // Academic
        'classes'           => 'Classes',
        'program_events'    => 'Program Events',
        'courses'           => 'Courses',
        'course_categories' => 'Course Categories',
        'intakes'           => 'Intakes',
        'enrollments'       => 'Enrollments',
        'student_scores'    => 'Student Scores',
        // ICT Club
        'ict_club'          => 'ICT Club',
        // Schools
        'schools'           => 'Schools',
        'school_categories' => 'School Categories',
        'school_levels'     => 'School Levels',
        // Administration
        'roles'             => 'Roles',
        'users'             => 'Users',
        // Content
        'homepage'          => 'Home Page',
        'settings'          => 'Settings',
        // Learning Portal
        'learning'          => 'Learning Portal',
        // Student Documents
        'admission_letter'  => 'Admission Letter',
        // Techsphere Classes
        'techsphere_classes' => 'Techsphere Classes',
    ];

    /** Per-module allowed actions — mirrors what the UI actually supports */
    public const MODULE_ACTIONS = [
        // Dashboard
        'dashboard'         => ['view', 'view_stats'],
        // People
        'students'          => ['view', 'create', 'update', 'delete', 'reset_password', 'view_stats'],
        'teachers'          => ['view', 'create', 'update', 'delete', 'reset_password', 'view_stats'],
        // Academic
        'classes'           => ['view', 'create', 'update', 'delete', 'view_stats'],
        'program_events'    => ['view', 'create', 'update', 'delete', 'view_stats'],
        'courses'           => ['view', 'create', 'update', 'delete', 'view_stats'],
        'course_categories' => ['view', 'create', 'update', 'delete', 'view_stats'],
        'intakes'           => ['view', 'create', 'update', 'delete', 'view_stats'],
        'enrollments'       => ['view', 'create', 'update', 'approve', 'reject', 'delete', 'view_stats'],
        'student_scores'    => ['view'],
        // ICT Club
        'ict_club'          => ['view', 'update', 'delete', 'view_stats'],
        // Schools
        'schools'           => ['view', 'create', 'update', 'delete', 'export', 'import', 'clear_all', 'view_stats'],
        'school_categories' => ['view', 'create', 'update', 'delete', 'view_stats'],
        'school_levels'     => ['view', 'create', 'update', 'delete', 'view_stats'],
        // Administration
        'roles'             => ['view', 'create', 'update', 'delete', 'manage_permissions', 'view_stats'],
        'users'             => ['view', 'create', 'update', 'delete', 'view_stats'],
        // Content
        'homepage'          => ['view', 'update'],
        'settings'          => ['view', 'update'],
        // Learning Portal
        'learning'          => ['view', 'view_scores', 'manage'],
        // Student Documents
        'admission_letter'  => ['view', 'download'],
        // Techsphere Classes
        'techsphere_classes' => ['view', 'create', 'edit', 'delete', 'join'],
    ];

    /**
     * Return the permissions for a role as a nested map:
     * { schools: { view: true, export: false, ... }, ... }
     */
    public function show(Role $role): JsonResponse
    {
        $rows = RolePermission::where('role_id', $role->id)->get();

        $map = [];
        foreach (self::MODULE_ACTIONS as $module => $actions) {
            foreach ($actions as $action) {
                $map[$module][$action] = false;
            }
        }

        foreach ($rows as $row) {
            if (isset($map[$row->module][$row->action])) {
                $map[$row->module][$row->action] = true;
            }
        }

        return response()->json([
            'permissions'    => $map,
            'modules'        => self::MODULES,
            'module_actions' => self::MODULE_ACTIONS,
        ]);
    }

    /**
     * Sync permissions for a role.
     * Expects: { permissions: { schools: { view: true, export: false, ... }, ... } }
     */
    public function sync(Request $request, Role $role): JsonResponse
    {
        // Delete existing and re-insert granted ones
        RolePermission::where('role_id', $role->id)->delete();

        $rows = [];
        $now  = now();

        foreach ($request->input('permissions', []) as $module => $actions) {
            if (!array_key_exists($module, self::MODULE_ACTIONS)) continue;
            foreach ((array) $actions as $action => $granted) {
                if (!in_array($action, self::MODULE_ACTIONS[$module])) continue;
                if ($granted) {
                    $rows[] = [
                        'role_id'    => $role->id,
                        'module'     => $module,
                        'action'     => $action,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        if (!empty($rows)) {
            RolePermission::insert($rows);
        }

        return response()->json(['message' => 'Permissions saved successfully.']);
    }
}
