import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isFuture, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Bell, Eye, Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateNotification, useMarkAsRead, useNotifications } from '@/hooks/useNotifications';
import { useProfiles } from '@/hooks/useProfiles';
import { useSchedules } from '@/hooks/useSchedules';
import { getAdminNotificationAction } from '@/lib/notification-actions';
import { useToast } from '@/hooks/use-toast';

const typeLabels: Record<string, string> = {
  schedule: 'Escala',
  reminder: 'Lembrete',
  announcement: 'Anúncio',
  change_request: 'Solicitação de Troca',
  approval_request: 'Solicitação de Acesso',
  confirmation: 'Confirmação',
  substitute_request: 'Substituição',
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: schedules } = useSchedules();
  const { data: profiles } = useProfiles();
  const { data: notifications, isLoading: isLoadingNotifications } = useNotifications(user?.id);
  const markAsReadMutation = useMarkAsRead();
  const createNotificationMutation = useCreateNotification();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [isSending, setIsSending] = useState(false);

  const upcomingSchedules = useMemo(() => {
    return (schedules ?? []).filter((schedule) => {
      const date = new Date(schedule.schedule_date);
      return isFuture(date) || isToday(date);
    });
  }, [schedules]);

  const selectedSchedule = useMemo(
    () => upcomingSchedules.find((schedule) => schedule.id === selectedScheduleId) ?? null,
    [selectedScheduleId, upcomingSchedules],
  );

  const pendingChangeRequests = useMemo(() => {
    return upcomingSchedules.flatMap((schedule) =>
      (schedule.members ?? [])
        .filter((member) => member.requested_change)
        .map((member) => ({
          scheduleId: schedule.id,
          scheduleDate: schedule.schedule_date,
          memberName: member.profile?.name ?? 'Membro',
          functionType: member.function_type,
          functionDetail: member.function_detail,
          reason: member.change_reason,
        })),
    );
  }, [upcomingSchedules]);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setSelectedScheduleId('');
  };

  const sendAnnouncement = async (userIds: string[], scheduleId?: string) => {
    for (const userId of userIds) {
      await createNotificationMutation.mutateAsync({
        user_id: userId,
        title,
        message,
        type: 'announcement',
        schedule_id: scheduleId,
      });
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      return;
    }

    setIsSending(true);

    try {
      if (selectedSchedule) {
        const scheduleMemberUserIds = (selectedSchedule.members ?? [])
          .map((member) => member.profile?.user_id)
          .filter((value): value is string => Boolean(value));
        const uniqueUserIds = Array.from(new Set(scheduleMemberUserIds));

        await sendAnnouncement(uniqueUserIds, selectedSchedule.id);
        toast({ title: 'Notificação enviada aos membros da escala!' });
      } else {
        const allUserIds = (profiles ?? []).map((profile) => profile.user_id);
        const uniqueUserIds = Array.from(new Set(allUserIds));

        await sendAnnouncement(uniqueUserIds);
        toast({ title: 'Notificação enviada para todos!' });
      }

      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar notificação.';
      toast({
        title: 'Erro ao enviar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenReceivedNotification = (notification: {
    id: string;
    read: boolean;
    type: string;
    title: string;
    schedule_id?: string | null;
  }) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    const action = getAdminNotificationAction(notification);

    if (action) {
      navigate(action.href);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Notificações</h1>
        <p className="text-muted-foreground">Envie mensagens e visualize solicitações</p>
      </header>

      <Tabs defaultValue="send" className="min-w-0 space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="send" className="shrink-0 gap-2">
            <Send className="h-4 w-4" />
            Enviar
          </TabsTrigger>
          <TabsTrigger value="requests" className="shrink-0 gap-2">
            <AlertTriangle className="h-4 w-4" />
            Solicitações
          </TabsTrigger>
          <TabsTrigger value="received" className="shrink-0 gap-2">
            <Bell className="h-4 w-4" />
            Recebidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card className="border-none shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-primary" />
                Nova Notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-title">Título</Label>
                <Input
                  id="notification-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex: Lembrete de ensaio"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-message">Mensagem</Label>
                <Textarea
                  id="notification-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Enviar para escala específica (opcional)</Label>
                <Select value={selectedScheduleId || 'all'} onValueChange={(value) => setSelectedScheduleId(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma escala ou deixe vazio para todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os membros</SelectItem>
                    {upcomingSchedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {format(new Date(schedule.schedule_date), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                        {(schedule.members ?? []).length} membro(s)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSchedule && (
                <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                  <p className="mb-1 font-medium">Membros que receberão:</p>
                  <div className="flex flex-wrap gap-1">
                    {(selectedSchedule.members ?? []).map((member) => (
                      <Badge key={member.id} variant="outline">
                        {member.profile?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSend} disabled={!title || !message || isSending}>
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {selectedSchedule ? 'Enviar para membros da escala' : 'Enviar para todos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card className="border-none shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Solicitações de Troca
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingChangeRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingChangeRequests.map((request, index) => (
                    <div key={`${request.scheduleId}-${request.memberName}-${index}`} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">{request.memberName}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.functionType}
                            {request.functionDetail ? ` - ${request.functionDetail}` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Escala: {format(new Date(request.scheduleDate), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          {request.reason && <p className="mt-1 text-sm text-orange-700">"{request.reason}"</p>}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin-app/schedules/${request.scheduleId}`)}>
                          <Eye className="mr-1 h-4 w-4" />
                          Abrir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">Nenhuma solicitação de troca pendente</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          <Card className="border-none shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Notificações Recebidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingNotifications ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (notifications ?? []).length > 0 ? (
                <div className="space-y-3">
                  {(notifications ?? []).map((notification) => {
                    const action = getAdminNotificationAction(notification);

                    return (
                      <div
                        key={notification.id}
                        className={`rounded-xl border p-4 ${
                          notification.read ? 'border-border' : 'border-l-4 border-l-primary bg-primary/5'
                        } transition-colors hover:bg-secondary/40`}
                        onClick={() => handleOpenReceivedNotification(notification)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="mb-1 flex items-center gap-2">
                              <h3 className="font-medium text-foreground">{notification.title}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {typeLabels[notification.type] || notification.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(notification.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </p>
                              {action && (
                                <span className="text-xs text-primary">{action.label}</span>
                              )}
                            </div>
                          </div>

                          {action && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenReceivedNotification(notification);
                              }}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">Nenhuma notificação recebida</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
