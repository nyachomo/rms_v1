import { useState, useEffect, createContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import DashboardNavbar  from './DashboardNavbar';

export const PageTitleContext = createContext({ setPageTitle: () => {} });

const PATH_TITLES = {
    '/dashboard/learning':               'My Learning',
    '/dashboard/learning/browse':        'Browse Programs',
    '/dashboard/learning/scores':        'My Scores',
    '/dashboard/learning/profile':       'Learning Profile',
    '/dashboard/learning/code-practice': 'Code Practice',
    '/dashboard/learning/admission-letter': 'Admission Letter',
    '/dashboard/learning/my-fees':          'My Fees',
};

export default function LearningLayout() {
    const location = useLocation();
    const [pageTitle, setPageTitle] = useState('Learning Portal');

    useEffect(() => {
        const staticTitle = PATH_TITLES[location.pathname];
        if (staticTitle) setPageTitle(staticTitle);
    }, [location.pathname]);

    return (
        <PageTitleContext.Provider value={{ setPageTitle }}>
            <div className="db-wrap">
                <DashboardSidebar />
                <div className="db-main" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                    <DashboardNavbar page={pageTitle} />
                    <Outlet />
                </div>
            </div>
        </PageTitleContext.Provider>
    );
}
