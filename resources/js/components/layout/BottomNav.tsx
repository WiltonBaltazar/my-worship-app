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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
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
