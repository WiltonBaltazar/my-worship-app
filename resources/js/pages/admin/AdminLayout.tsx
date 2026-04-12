import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Eye,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Music,
  SlidersHorizontal,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { usePendingProfilesCount } from '@/hooks/useProfiles';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin-app' },
  { icon: Calendar, label: 'Escalas', path: '/admin-app/schedules' },
  { icon: SlidersHorizontal, label: 'Escala Técnica', path: '/admin-app/tech-schedules' },
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
    <div className="relative min-h-screen bg-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen((prev) => !prev)}>
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <div className="text-center">
          <p className="text-base font-semibold text-slate-900">WORA Admin</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Control Center</p>
        </div>

        <div className="w-10" />
      </header>

      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-[18rem] flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="border-b border-slate-200 px-5 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">WORA PLATFORM</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Admin</h1>
            <p className="mt-1 text-sm text-slate-500">Painel administrativo</p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = isPathActive(item.path);
              const badgeCount =
                item.path === '/admin-app/notifications'
                  ? unreadNotificationsCount
                  : item.path === '/admin-app/users'
                    ? pendingUsersCount
                    : 0;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'group relative flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>

                  {badgeCount > 0 && (
                    <span
                      className={cn(
                        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        isActive ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white',
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
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

        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-20 hidden items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur lg:flex">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Admin Area</p>
              <p className="text-lg font-semibold text-slate-900">Painel de Gestão</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{user?.name ?? 'Administrador'}</p>
              <p className="text-xs text-slate-500">Sessão ativa</p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-7xl animate-fade-in px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
