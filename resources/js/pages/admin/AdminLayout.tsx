import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { usePendingProfilesCount } from '@/hooks/useProfiles';
import { cn } from '@/lib/utils';

const RAIL_STORAGE_KEY = 'wora:admin-sidebar';

function readStoredRail() {
  try {
    return window.localStorage.getItem(RAIL_STORAGE_KEY) === 'rail';
  } catch {
    return false;
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, isAdmin, isLeader } = useAuth();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationCount(user?.id);
  const { data: pendingUsersCount = 0 } = usePendingProfilesCount(user?.id, isLeader);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [prefersRail, setPrefersRail] = useState(readStoredRail);
  // Between lg and xl there is only room for the icon rail.
  const isWide = useMediaQuery('(min-width: 1280px)');
  const isRail = prefersRail || !isWide;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleRail = () => {
    const next = !isRail;
    setPrefersRail(next);
    try {
      window.localStorage.setItem(RAIL_STORAGE_KEY, next ? 'rail' : 'expanded');
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut();
      navigate('/auth', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const sidebarProps = {
    badges: { notifications: unreadNotificationsCount, pendingUsers: pendingUsersCount },
    userName: user?.name ?? 'Administrador',
    userRole: isAdmin ? 'Administrador' : 'Líder',
    isSigningOut,
    onSignOut: handleSignOut,
  };

  return (
    <div className="flex min-h-screen bg-surface-sunken">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:block',
          isRail ? 'w-[72px]' : 'w-64',
        )}
      >
        <AdminSidebar rail={isRail} {...sidebarProps} />
      </aside>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[19rem] border-sidebar-border bg-sidebar p-0 sm:max-w-[19rem]">
          <SheetTitle className="sr-only">Menu do admin</SheetTitle>
          <SheetDescription className="sr-only">Navegação entre as áreas do painel administrativo</SheetDescription>
          <AdminSidebar {...sidebarProps} onNavigate={() => setIsMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          unreadNotifications={unreadNotificationsCount}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onToggleRail={toggleRail}
        />

        <main className="mx-auto w-full max-w-[1440px] animate-fade-in px-4 py-6 md:px-6 xl:px-8 xl:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
