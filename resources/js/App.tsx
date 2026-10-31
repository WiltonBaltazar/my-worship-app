import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiRequest, getAuthToken } from "@/lib/api";
import Auth from "./pages/Auth";
import MemberDashboard from "./pages/MemberDashboard";
import Schedules from "./pages/Schedules";
import ScheduleDetails from "./pages/ScheduleDetails";
import SongDetails from "./pages/SongDetails";
import Repertoire from "./pages/Repertoire";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Notifications from "./pages/Notifications";
import ReceivedNotifications from "./pages/ReceivedNotifications";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminHome from "./pages/admin/AdminHome";
import AdminSchedules from "./pages/admin/AdminSchedules";
import AdminScheduleDetails from "./pages/admin/AdminScheduleDetails";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminAvailability from "./pages/admin/AdminAvailability";
import AdminRepertoire from "./pages/admin/AdminRepertoire";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminUsers from "./pages/admin/AdminUsers";
import SoundTechSchedules from "./pages/SoundTechSchedules";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PushNotificationReadSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notificationId = params.get('wora_notification_id');

    if (!notificationId || !getAuthToken()) {
      return;
    }

    let isMounted = true;

    apiRequest<{ message: string }>(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    })
      .catch((error) => {
        console.error('Failed to mark opened push notification as read:', error);
      })
      .finally(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

        if (!isMounted) {
          return;
        }

        const nextParams = new URLSearchParams(location.search);
        nextParams.delete('wora_notification_id');
        const nextSearch = nextParams.toString();

        navigate(
          {
            pathname: location.pathname,
            search: nextSearch ? `?${nextSearch}` : '',
            hash: location.hash,
          },
          { replace: true },
        );
      });

    return () => {
      isMounted = false;
    };
  }, [location.hash, location.pathname, location.search, navigate, queryClient]);

  return null;
}

function ServiceWorkerNavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'wora:navigate' || typeof event.data.url !== 'string') {
        return;
      }

      const url = new URL(event.data.url, window.location.origin);
      if (url.origin !== window.location.origin) {
        return;
      }

      navigate(`${url.pathname}${url.search}${url.hash}`);
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  return null;
}

// Only the admin area has a finished dark theme; the member app stays light.
function AppThemeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isAdminArea = pathname.startsWith("/admin-app");

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="wora:theme"
      forcedTheme={isAdminArea ? undefined : "light"}
    >
      {children}
    </ThemeProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PushNotificationReadSync />
          <ServiceWorkerNavigationListener />
          <AppThemeProvider>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected member routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <MemberDashboard />
                </ProtectedRoute>
              } />
              <Route path="/schedules" element={
                <ProtectedRoute>
                  <Schedules />
                </ProtectedRoute>
              } />
              <Route path="/schedules/:id" element={
                <ProtectedRoute>
                  <ScheduleDetails />
                </ProtectedRoute>
              } />
              <Route path="/songs/:id" element={
                <ProtectedRoute>
                  <SongDetails />
                </ProtectedRoute>
              } />
              <Route path="/repertoire" element={
                <ProtectedRoute>
                  <Repertoire />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/profile/edit" element={
                <ProtectedRoute>
                  <EditProfile />
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              <Route path="/notifications/received" element={
                <ProtectedRoute>
                  <ReceivedNotifications />
                </ProtectedRoute>
              } />
              <Route path="/tech-schedules" element={
                <ProtectedRoute requireSoundTechManager>
                  <SoundTechSchedules />
                </ProtectedRoute>
              } />

              {/* Protected admin routes */}
              <Route path="/admin-app" element={
                <ProtectedRoute requireLeader>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminHome />} />
                <Route path="schedules" element={<AdminSchedules />} />
                <Route path="schedules/:id" element={<AdminScheduleDetails />} />
                <Route path="tech-schedules" element={<SoundTechSchedules />} />
                <Route path="members" element={<AdminMembers />} />
                <Route path="availability" element={<AdminAvailability />} />
                <Route path="repertoire" element={<AdminRepertoire />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="users" element={
                  <ProtectedRoute requireLeader>
                    <AdminUsers />
                  </ProtectedRoute>
                } />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppThemeProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
