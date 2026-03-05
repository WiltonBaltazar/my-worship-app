import { Home, Calendar, Music, User } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Início', path: user ? '/dashboard' : '/' },
    { icon: Calendar, label: 'Escalas', path: '/schedules' },
    { icon: Music, label: 'Repertório', path: '/repertoire' },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card">
      <div className="mx-auto flex max-w-lg items-center justify-around pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.label === 'Início' && location.pathname === '/' && !user) ||
            (item.label === 'Início' && location.pathname === '/dashboard' && user);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "nav-item relative",
                isActive && "active"
              )}
            >
              <div className="relative">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
