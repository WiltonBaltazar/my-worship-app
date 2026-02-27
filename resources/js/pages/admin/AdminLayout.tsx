import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Calendar, Eye, LayoutDashboard, Loader2, LogOut, Menu, Music, UserCog, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { usePendingProfilesCount } from '@/hooks/useProfiles';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin-app' },
  { icon: Calendar, label: 'Escalas', path: '/admin-app/schedules' },
  { icon: Users, label: 'Membros', path: '/admin-app/members' },
  { icon: Music, label: 'Repertório', path: '/admin-app/repertoire' },
  { icon: UserCog, label: 'Usuários', path: '/admin-app/users' },
  { icon: Bell, label: 'Notificações', path: '/admin-app/notifications' },
  { icon: Eye, label: 'Ver como Membro', path: '/dashboard' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, isLeader } = useAuth();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationCount(user?.id);
  const { data: pendingUsersCount = 0 } = usePendingProfilesCount(user?.id, isLeader);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isPathActive = (path: string) => {
    if (path === '/admin-app') {
      return location.pathname === path;
    }

    return location.pathname.startsWith(path);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen((prev) => !prev)}>
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div>
          <p className="text-base font-bold text-primary">WORA</p>
          <p className="text-xs text-muted-foreground">Painel Administrativo</p>
        </div>
        <div className="w-9" />
      </header>

      <div className="flex">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-card transition-transform lg:sticky lg:bottom-auto lg:top-0 lg:h-screen lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="border-b border-border px-6 py-8">
            <h1 className="text-4xl font-bold text-primary">WORA</h1>
            <p className="text-lg text-muted-foreground">Painel Administrativo</p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = isPathActive(item.path);
              const badgeCount =
                item.path === '/admin-app/notifications'
                  ? unreadNotificationsCount
                  : item.path === '/admin-app/users'
                    ? pendingUsersCount
                    : 0;
              const shouldShowBadge = badgeCount > 0;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-2xl px-4 py-3 text-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {shouldShowBadge && (
                    <span
                      className={cn(
                        'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        isActive
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-primary text-primary-foreground',
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border px-4 py-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-5 w-5" />
              )}
              Sair
            </Button>
          </div>
        </aside>

        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Fechar menu lateral"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
