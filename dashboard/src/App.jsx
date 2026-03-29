import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar.jsx";
import { useExtensionState } from "./hooks/useExtensionState.js";
import DashboardPage from "./pages/DashboardPage.jsx";
import BlockedSitesPage from "./pages/BlockedSitesPage.jsx";
import TrackerActivityPage from "./pages/TrackerActivityPage.jsx";
import LoginAlertsPage from "./pages/LoginAlertsPage.jsx";
import PrivacyReportsPage from "./pages/PrivacyReportsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import ProtectionPreferencesPage from "./pages/auth/ProtectionPreferencesPage.jsx";
import NotificationPreferencesPage from "./pages/auth/NotificationPreferencesPage.jsx";

function MainLayout() {
  const { state, hasChrome, hydrated } = useExtensionState();

  if (!hasChrome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground max-w-md mx-auto">
        Open this app from the Private-C extension (toolbar → Open full dashboard, or Extension options) to enable authentication and storage.
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!state?.isLoggedIn) {
    return <Navigate to="/auth/login" replace />;
  }

  const stage = state.auth?.stage;
  if (stage === "verify") {
    return <Navigate to="/auth/protection" replace />;
  }
  if (stage === "protection") {
    return <Navigate to="/auth/protection" replace />;
  }
  if (stage === "notifications") {
    return <Navigate to="/auth/notifications" replace />;
  }

  return (
    <div className="flex min-h-screen font-sans bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/verify" element={<Navigate to="/auth/protection" replace />} />
        <Route path="/auth/protection" element={<ProtectionPreferencesPage />} />
        <Route path="/auth/notifications" element={<NotificationPreferencesPage />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/blocked-sites" element={<BlockedSitesPage />} />
          <Route path="/tracker-activity" element={<TrackerActivityPage />} />
          <Route path="/login-alerts" element={<LoginAlertsPage />} />
          <Route path="/privacy-reports" element={<PrivacyReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/blocked" element={<Navigate to="/blocked-sites" replace />} />
          <Route path="/trackers" element={<Navigate to="/tracker-activity" replace />} />
          <Route path="/reports" element={<Navigate to="/privacy-reports" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
