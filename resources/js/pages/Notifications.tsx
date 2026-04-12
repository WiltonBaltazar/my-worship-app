import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Check, CheckCheck, Trash2, Loader2, Calendar, ExternalLink, UserCheck, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { useMySubstituteRequests, useAcceptSubstituteRequest, useRejectSubstituteRequest } from '@/hooks/useSubstituteRequests';
import { getMemberNotificationAction } from '@/lib/notification-actions';
import { cn } from '@/lib/utils';

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

export default function Notifications() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: notifications, isLoading } = useNotifications(user?.id);
  const { data: substituteRequests } = useMySubstituteRequests(user?.id);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const acceptRequestMutation = useAcceptSubstituteRequest();
  const rejectRequestMutation = useRejectSubstituteRequest();

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    if (user?.id && unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const handleDelete = (id: string) => {
    deleteNotificationMutation.mutate(id);
  };

  const handleNotificationClick = (notification: NotificationWithSchedule) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    const action = getMemberNotificationAction(notification);

    if (action) {
      navigate(action.href);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'confirmation':
        return <Check className="h-4 w-4 text-success" />;
      case 'change_request':
        return <Bell className="h-4 w-4 text-accent" />;
      case 'schedule':
        return <Calendar className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notificações</h1>
            <p className="text-sm text-muted-foreground">Solicitações e alertas recentes</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/notifications/received')}>
              Ver todas recebidas
            </Button>
            <PushNotificationToggle />
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar lidas
              </Button>
            )}
          </div>
        </div>

        {/* Substitute Requests */}
        {substituteRequests && substituteRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Solicitações de substituição</h2>
            {substituteRequests.map((request) => {
              const scheduleDate = request.schedule_member?.schedule?.schedule_date;
              const requesterName = request.schedule_member?.profile?.name;
              const functionType = request.schedule_member?.function_type;
              
              return (
                <Card key={request.id} className="border-l-4 border-l-accent bg-accent/10 p-4">
                  <div className="flex items-start gap-3">
                    <UserCheck className="mt-0.5 h-5 w-5 text-accent" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {requesterName} pediu substituição
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Escala de {scheduleDate ? format(new Date(scheduleDate), "dd/MM/yyyy", { locale: ptBR }) : 'data desconhecida'}
                        {functionType && ` - ${functionType}`}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={async () => {
                            await acceptRequestMutation.mutateAsync({
                              requestId: request.id,
                              scheduleMemberId: request.schedule_member_id,
                              candidateProfileId: request.candidate_profile_id,
                              candidateName: profile?.name || 'Alguém',
                              functionType: request.schedule_member?.function_type || 'instrumentalist',
                              functionDetail: request.schedule_member?.function_detail || null
                            });
                          }}
                          disabled={acceptRequestMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => rejectRequestMutation.mutate({
                            requestId: request.id,
                            candidateName: profile?.name || 'Alguém'
                          })}
                          disabled={rejectRequestMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Regular Notifications */}
        {!notifications || notifications.length === 0 ? (
          substituteRequests?.length === 0 && (
            <Card className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Você não tem notificações.</p>
            </Card>
          )
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const notif = notification as NotificationWithSchedule;
              const action = getMemberNotificationAction(notif);

              return (
                <Card 
                  key={notif.id}
                  className={cn(
                    "cursor-pointer p-4 transition-all hover:-translate-y-0.5",
                    !notif.read && "border-l-4 border-l-primary bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn(
                          "font-medium text-foreground",
                          !notif.read && "font-semibold"
                        )}>
                          {notif.title}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notif.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notif.message}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notif.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {action && (
                          <span className="text-xs text-primary flex items-center gap-1">
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
