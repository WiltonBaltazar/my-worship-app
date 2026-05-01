import { Calendar, Home, Music, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type NavItem = {
  icon: typeof Home;
  label: string;
  path: string;
  activePrefixes: string[];
};

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: 'Início',
      path: user ? '/dashboard' : '/',
      activePrefixes: user ? ['/dashboard'] : ['/'],
    },
    {
      icon: Calendar,
      label: 'Escalas',
      path: '/schedules',
      activePrefixes: ['/schedules'],
    },
    {
      icon: Music,
      label: 'Repertório',
      path: '/repertoire',
      activePrefixes: ['/repertoire', '/songs'],
    },
    {
      icon: User,
      label: 'Perfil',
      path: '/profile',
      activePrefixes: ['/profile'],
    },
  ];

  const matchesPrefix = (prefix: string) =>
    location.pathname === prefix || location.pathname.startsWith(`${prefix}/`);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mx-auto max-w-xl rounded-[1.85rem] border border-border/65 bg-card p-2 shadow-elevated">
          <ul className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.activePrefixes.some(matchesPrefix);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground transition-all duration-300',
                      isActive
                        ? 'bg-[linear-gradient(145deg,hsl(var(--primary))_0%,hsl(24_88%_51%)_100%)] text-primary-foreground shadow-soft'
                        : 'hover:bg-secondary/65 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-[18px] w-[18px]', isActive && 'scale-110')} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute -top-1 h-1.5 w-8 rounded-full bg-white/85" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
