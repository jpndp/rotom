import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import RequireRole from './components/RequireRole';
import HomePage from './pages/HomePage';
import ClubsPage from './pages/ClubsPage';
import ClubDetailPage from './pages/ClubDetailPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import AnnouncementsFeedPage from './pages/AnnouncementsFeedPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MyRegistrationsPage from './pages/MyRegistrationsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminClubPage from './pages/admin/AdminClubPage';
import EventFormPage from './pages/admin/EventFormPage';
import ClubFormPage from './pages/admin/ClubFormPage';
import RegistrantsPage from './pages/admin/RegistrantsPage';
import AttendancePage from './pages/admin/AttendancePage';
import AnnouncementsPage from './pages/admin/AnnouncementsPage';
import OrgChartPage from './pages/admin/OrgChartPage';
import ClubOrgChartPage from './pages/ClubOrgChartPage';
import CalendarPage from './pages/admin/CalendarPage';
import ModerationPage from './pages/admin/ModerationPage';
import './App.css';

const ADMIN_ROLES = ['club_admin', 'website_admin'];

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/clubs" element={<ClubsPage />} />
            <Route path="/clubs/:id" element={<ClubDetailPage />} />
            <Route path="/clubs/:id/org-chart" element={<RequireRole roles={['student', 'club_admin', 'website_admin']}><ClubOrgChartPage /></RequireRole>} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/calendar" element={<Navigate to="/events" replace />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/announcements" element={<AnnouncementsFeedPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/my-registrations" element={<MyRegistrationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/admin" element={<RequireRole roles={ADMIN_ROLES}><AdminDashboardPage /></RequireRole>} />
            <Route path="/admin/calendar" element={<RequireRole roles={['website_admin']}><CalendarPage /></RequireRole>} />
            <Route path="/admin/moderation" element={<RequireRole roles={['website_admin']}><ModerationPage /></RequireRole>} />
            <Route path="/admin/clubs/new" element={<RequireRole roles={['website_admin']}><ClubFormPage /></RequireRole>} />
            <Route path="/admin/clubs/:clubId" element={<RequireRole roles={ADMIN_ROLES}><AdminClubPage /></RequireRole>} />
            <Route path="/admin/clubs/:clubId/edit" element={<RequireRole roles={ADMIN_ROLES}><ClubFormPage /></RequireRole>} />
            <Route path="/admin/clubs/:clubId/events/new" element={<RequireRole roles={ADMIN_ROLES}><EventFormPage /></RequireRole>} />
            <Route path="/admin/clubs/:clubId/events/:eventId/edit" element={<RequireRole roles={ADMIN_ROLES}><EventFormPage /></RequireRole>} />
            <Route path="/admin/clubs/:clubId/events/:eventId/registrants" element={<RequireRole roles={ADMIN_ROLES}><RegistrantsPage /></RequireRole>} />
            <Route path="/admin/clubs/:clubId/events/:eventId/attendance" element={<RequireRole roles={ADMIN_ROLES}><AttendancePage /></RequireRole>} />
            <Route path="/admin/clubs/:clubId/org-chart" element={<RequireRole roles={ADMIN_ROLES}><OrgChartPage /></RequireRole>} />
            <Route path="/admin/clubs/:clubId/announcements" element={<RequireRole roles={ADMIN_ROLES}><AnnouncementsPage /></RequireRole>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;