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

function NotificationButton({ notificationCount = 0 }: { notificationCount?: number }) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative rounded-2xl border-border/70 bg-card/95 shadow-soft"
      asChild
    >
      <Link to="/notifications/received">
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </Link>
    </Button>
  );
}

export function Header({
  userName,
  avatarUrl,
  notificationCount = 0,
  title,
  showNotifications = false,
}: HeaderProps) {
  const initials = userName
    ? userName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  const readableDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  if (title && !userName) {
    return (
      <header className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/95 p-5 shadow-card animate-fade-in">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">WORA</p>
            <h1 className="truncate text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{readableDate}</p>
          </div>

          {showNotifications && <NotificationButton notificationCount={notificationCount} />}
        </div>
      </header>
    );
  }

  return (
    <header className="relative mb-6 overflow-hidden rounded-[1.85rem] border border-border/65 bg-card/95 p-4 shadow-card animate-fade-in sm:p-5">
      <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-primary/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-white/65 shadow-soft">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback className="bg-primary/15 font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Worship Flow</p>
            <h2 className="truncate text-lg font-semibold text-foreground">{userName}</h2>
            <p className="truncate text-xs text-muted-foreground">{readableDate}</p>
          </div>
        </div>

        <NotificationButton notificationCount={notificationCount} />
      </div>
    </header>
  );
}
