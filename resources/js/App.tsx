import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PushNotificationReadSync />
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
