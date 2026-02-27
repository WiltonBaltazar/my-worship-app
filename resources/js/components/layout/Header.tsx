import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  userName?: string;
  avatarUrl?: string;
  notificationCount?: number;
  title?: string;
  showNotifications?: boolean;
}

export function Header({ userName, avatarUrl, notificationCount = 0, title, showNotifications = false }: HeaderProps) {
  const initials = userName
    ? userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  // Title-only mode
  if (title && !userName) {
    return (
      <header className="flex items-center justify-between mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        
        {showNotifications && (
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link to="/notifications">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>
          </Button>
        )}
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between mb-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm text-muted-foreground">Seja bem vindo de volta</p>
          <h2 className="font-semibold text-foreground">{userName}</h2>
        </div>
      </div>
      
      <Button variant="ghost" size="icon" className="relative" asChild>
        <Link to="/notifications">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Link>
      </Button>
    </header>
  );
}
