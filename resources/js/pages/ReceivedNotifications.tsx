import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Check, CheckCheck, ExternalLink, Loader2, Search, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteNotification, useMarkAllAsRead, useMarkAsRead, useNotifications } from '@/hooks/useNotifications';
import { getMemberNotificationAction } from '@/lib/notification-actions';
import { cn } from '@/lib/utils';

type FilterMode = 'all' | 'unread' | 'read';

interface NotificationWithSchedule {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean | null;
  created_at: string;
  schedule_id?: string | null;
}

function getNotificationIcon(type: string) {
  if (type === 'confirmation') {
    return <Check className="h-4 w-4 text-success" />;
  }

  if (type === 'schedule') {
    return <Bell className="h-4 w-4 text-primary" />;
  }

  return <Bell className="h-4 w-4 text-accent" />;
}

export default function ReceivedNotifications() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: notifications, isLoading } = useNotifications(user?.id);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const unreadCount = notifications?.filter((notification) => !notification.read).length || 0;

  const sortedNotifications = useMemo(() => {
    return [...(notifications ?? [])].sort((left, right) => {
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedNotifications.filter((notification) => {
      const byReadState =
        filterMode === 'all' ||
        (filterMode === 'unread' && !notification.read) ||
        (filterMode === 'read' && notification.read);

      if (!byReadState) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        notification.title.toLowerCase().includes(normalizedQuery) ||
        notification.message.toLowerCase().includes(normalizedQuery) ||
        notification.type.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filterMode, searchQuery, sortedNotifications]);

  const handleNotificationClick = (notification: NotificationWithSchedule) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    const action = getMemberNotificationAction(notification);

    if (action) {
      navigate(action.href);
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header
        userName={profile?.name || 'Usuário'}
        avatarUrl={profile?.avatar_url || undefined}
        notificationCount={unreadCount}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notificações Recebidas</h1>
            <p className="text-sm text-muted-foreground">
              Histórico completo das suas notificações
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/notifications">Solicitações</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar lidas
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={cn(
              'rounded-xl border p-2 text-sm font-medium transition-colors',
              filterMode === 'all'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-secondary/60',
            )}
          >
            Todas ({sortedNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unread')}
            className={cn(
              'rounded-xl border p-2 text-sm font-medium transition-colors',
              filterMode === 'unread'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-secondary/60',
            )}
          >
            Não lidas ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('read')}
            className={cn(
              'rounded-xl border p-2 text-sm font-medium transition-colors',
              filterMode === 'read'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-secondary/60',
            )}
          >
            Lidas ({sortedNotifications.length - unreadCount})
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por título, mensagem ou tipo..."
            className="pl-10"
          />
        </div>

        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma notificação encontrada.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const notif = notification as NotificationWithSchedule;
              const action = getMemberNotificationAction(notif);

              return (
                <Card
                  key={notif.id}
                  className={cn(
                    'cursor-pointer p-4 transition-all hover:-translate-y-0.5',
                    !notif.read && 'border-l-4 border-l-primary bg-primary/5',
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className={cn('truncate font-medium text-foreground', !notif.read && 'font-semibold')}>
                            {notif.title}
                          </h3>
                          <Badge variant="secondary" className="mt-1 text-[10px] uppercase tracking-wide">
                            {notif.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteNotificationMutation.mutate(notif.id);
                          }}
                          disabled={deleteNotificationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notif.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notif.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {action && (
                          <span className="flex items-center gap-1 text-xs text-primary">
                            <ExternalLink className="h-3 w-3" />
                            {action.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

