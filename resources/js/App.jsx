import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useParams } from 'react-router-dom';
import { useEffect, Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { error: null }; }
    static getDerivedStateFromError(error) { return { error }; }
    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff0f0', minHeight: '100vh' }}>
                    <h2 style={{ color: '#c00' }}>React Error (check console for full trace)</h2>
                    <pre style={{ color: '#900', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {this.state.error.message}{'\n\n'}{this.state.error.stack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

function ThemeLoader() {
    useEffect(() => {
        fetch('/api/theme')
            .then(r => r.json())
            .then(({ theme_primary, theme_navy }) => {
                if (theme_primary) document.documentElement.style.setProperty('--red',  theme_primary);
                if (theme_navy)    document.documentElement.style.setProperty('--navy', theme_navy);
            })
            .catch(() => {});
    }, []);
    return null;
}

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';

import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Contact from './pages/Contact';
import IctClub from './pages/IctClub';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import ProgramEvents from './pages/ProgramEvents';
import HomePage from './pages/HomePage';
import AdminCourses from './pages/AdminCourses';
import Intakes from './pages/Intakes';
import Classes from './pages/Classes';
import Profile from './pages/Profile';
import Schools from './pages/Schools';
import SchoolCategories from './pages/SchoolCategories';
import SchoolLevels from './pages/SchoolLevels';
import Roles from './pages/Roles';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import Enrol from './pages/Enrol';
import AdminEnrollments from './pages/AdminEnrollments';
import AdminIctClub from './pages/AdminIctClub';
import AdminCourseCategories from './pages/AdminCourseCategories';
import AdminCourseLessons from './pages/AdminCourseLessons';
import Learning from './pages/Learning';
import BrowsePrograms from './pages/BrowsePrograms';
import CourseLearner from './pages/CourseLearner';
import LearnerProfile from './pages/LearnerProfile';
import LearnerScores  from './pages/LearnerScores';
import CodePractice from './pages/CodePractice';
import LearningLayout from './components/LearningLayout';
import Dashboard from './pages/Dashboard';
import AdminScores from './pages/AdminScores';
import ManualGradebook from './pages/ManualGradebook';
import TechsphereClasses from './pages/TechsphereClasses';
import MyTechsphereClasses from './pages/MyTechsphereClasses';
import AdminAdmissionLetters from './pages/AdminAdmissionLetters';
import StudentAdmissionLetter from './pages/StudentAdmissionLetter';
import AdminFeeManagement from './pages/AdminFeeManagement';
import StudentMyFees from './pages/StudentMyFees';

import '../css/app.css';

/* Wrapper that enforces auth for all /dashboard/* children */
function DashboardGuard() {
    return (
        <ProtectedRoute>
            <Outlet />
        </ProtectedRoute>
    );
}

// Ordered list of dashboard pages: the first one the user can 'view' is shown.
const DASHBOARD_PAGES = [
    { perm: ['students',          'view'], to: '/dashboard/students' },
    { perm: ['teachers',          'view'], to: '/dashboard/teachers' },
    { perm: ['classes',           'view'], to: '/dashboard/classes' },
    { perm: ['program_events',    'view'], to: '/dashboard/program-events' },
    { perm: ['courses',           'view'], to: '/dashboard/courses' },
    { perm: ['course_categories', 'view'], to: '/dashboard/course-categories' },
    { perm: ['intakes',           'view'], to: '/dashboard/intakes' },
    { perm: ['enrollments',       'view'], to: '/dashboard/enrollments' },
    { perm: ['student_scores',   'view'], to: '/dashboard/student-scores' },
    { perm: ['ict_club',          'view'], to: '/dashboard/ict-club' },
    { perm: ['schools',           'view'], to: '/dashboard/schools' },
    { perm: ['school_categories', 'view'], to: '/dashboard/school-categories' },
    { perm: ['school_levels',     'view'], to: '/dashboard/school-levels' },
    { perm: ['roles',             'view'], to: '/dashboard/roles' },
    { perm: ['users',             'view'], to: '/dashboard/users' },
    { perm: ['homepage',          'view'], to: '/dashboard/homepage' },
    { perm: ['settings',          'view'], to: '/dashboard/settings' },
    { perm: ['learning',          'view'], to: '/dashboard/learning' },
];

function DashboardIndex() {
    const { user, can } = useAuth();
    if (!user) return null;

    // Super-admin and any user with at least one non-learning admin permission → dashboard
    if (user.permissions === null) return <Dashboard />;
    const hasAdminPerm = DASHBOARD_PAGES.some(({ perm }) => perm[0] !== 'learning' && can(perm[0], perm[1]));
    if (hasAdminPerm) return <Dashboard />;

    // Learning-only users → profile page first
    return <Navigate to="/dashboard/learning/profile" replace />;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ThemeLoader />
                <Routes>
                    {/* Auth — no navbar/footer */}
                    <Route path="/login"            element={<Login />} />
                    <Route path="/forgot-password"  element={<ForgotPassword />} />
                    <Route path="/register"         element={<Register />} />

                    {/* All dashboard routes — protected by DashboardGuard */}
                    <Route path="/dashboard" element={<DashboardGuard />}>
                        <Route index                 element={<DashboardIndex />} />
                        <Route path="students"       element={<Students />} />
                        <Route path="teachers"       element={<Teachers />} />
                        <Route path="program-events" element={<ProgramEvents />} />
                        <Route path="homepage"       element={<HomePage />} />
                        <Route path="courses"        element={<AdminCourses />} />
                        <Route path="intakes"        element={<Intakes />} />
                        <Route path="enrollments"    element={<AdminEnrollments />} />
                        <Route path="ict-club"            element={<AdminIctClub />} />
                        <Route path="course-categories"   element={<AdminCourseCategories />} />
                        <Route path="courses/:courseId/lessons" element={<AdminCourseLessons />} />
                        <Route path="classes"        element={<Classes />} />
                        <Route path="techsphere-classes"    element={<TechsphereClasses />} />
                        <Route path="my-techsphere-classes" element={<MyTechsphereClasses />} />
                        <Route path="admission-letters"  element={<AdminAdmissionLetters />} />
                        <Route path="fee-management"     element={<AdminFeeManagement />} />
                        <Route path="profile"        element={<Profile />} />
                        <Route path="schools"        element={<Schools />} />
                        <Route path="school-categories" element={<SchoolCategories />} />
                        <Route path="school-levels"  element={<SchoolLevels />} />
                        <Route path="roles"          element={<Roles />} />
                        <Route path="users"          element={<Users />} />
                        <Route path="settings"       element={<Settings />} />
                        <Route path="student-scores"             element={<AdminScores />} />
                        <Route path="manual-gradebook"          element={<ManualGradebook />} />
                        <Route path="learning" element={<LearningLayout />}>
                            <Route index                      element={<Learning />} />
                            <Route path="browse"             element={<BrowsePrograms />} />
                            <Route path="scores"             element={<LearnerScores />} />
                            <Route path="code-practice"          element={<CodePractice />} />
                            <Route path="code-practice/python"   element={<CodePractice initialMode="python" />} />
                            <Route path="code-practice/r"        element={<CodePractice initialMode="r" />} />
                            <Route path="my-fees"            element={<StudentMyFees />} />
                            <Route path="admission-letter"   element={<StudentAdmissionLetter />} />
                            <Route path="profile"            element={<LearnerProfile />} />
                            <Route path=":courseSlug"        element={<CourseLearner />} />
                        </Route>
                    </Route>

                    {/* Legacy /learn routes → redirect to dashboard */}
                    <Route path="/learn" element={<Navigate to="/dashboard/learning" replace />} />
                    <Route path="/learn/profile" element={<Navigate to="/dashboard/learning/profile" replace />} />
                    <Route path="/learn/code-practice" element={<Navigate to="/dashboard/learning/code-practice" replace />} />
                    <Route path="/learn/:courseSlug" element={<LearnRedirect />} />

                    {/* Public site — with navbar/footer */}
                    <Route path="/*" element={
                        <>
                            <CookieBanner />
                            <Navbar />
                            <main>
                                <Routes>
                                    <Route path="/"                  element={<Home />} />
                                    <Route path="/courses"           element={<Courses />} />
                                    <Route path="/courses/:courseId" element={<CourseDetail />} />
                                    <Route path="/enroll/:courseSlug" element={<Enrol />} />
                                    <Route path="/contact"           element={<Contact />} />
                                    <Route path="/ict-club"          element={<IctClub />} />
                                    <Route path="*"                  element={<NotFound />} />
                                </Routes>
                            </main>
                            <Footer />
                        </>
                    } />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

function LearnRedirect() {
    const { courseSlug } = useParams();
    return <Navigate to={`/dashboard/learning/${courseSlug}`} replace />;
}

function NotFound() {
    return (
        <div style={{ padding: '180px 20px 80px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '4rem', color: '#fe730c', marginBottom: '24px' }}></i>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', color: '#081f4e', fontSize: '2rem', marginBottom: '12px' }}>Page Not Found</h1>
            <p style={{ color: '#666', marginBottom: '28px', fontSize: '1.05rem' }}>The page you're looking for doesn't exist.</p>
            <a href="/" style={{ background: '#fe730c', color: '#fff', padding: '14px 32px', borderRadius: '50px', fontFamily: 'Poppins, sans-serif', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>
                Go Home
            </a>
        </div>
    );
}

createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
