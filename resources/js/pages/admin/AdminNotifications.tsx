import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isFuture, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminMinistry } from '@/hooks/useAdminMinistry';
import {
  useCreateNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { useProfiles } from '@/hooks/useProfiles';
import { useSchedules } from '@/hooks/useSchedules';
import { getAdminNotificationAction } from '@/lib/notification-actions';
import { useToast } from '@/hooks/use-toast';

const typeConfig: Record<string, { label: string; className: string }> = {
  schedule: { label: 'Escala', className: 'bg-ministry-ghj/10 text-ministry-ghj-strong border-ministry-ghj/30' },
  reminder: { label: 'Lembrete', className: 'bg-warning/15 text-warning-strong border-warning/40' },
  announcement: { label: 'Anúncio', className: 'bg-muted text-foreground border-border' },
  change_request: { label: 'Solicitação de Troca', className: 'bg-primary/10 text-primary-strong border-primary/30' },
  approval_request: { label: 'Acesso', className: 'bg-chart-4/15 text-foreground border-chart-4/40' },
  confirmation: { label: 'Confirmação', className: 'bg-success/10 text-success-strong border-success/30' },
  substitute_request: { label: 'Substituição', className: 'bg-destructive/10 text-destructive-strong border-destructive/30' },
};

function TypeBadge({ type }: { type: string }) {
  const config = typeConfig[type] ?? { label: type, className: 'bg-muted text-foreground border-border' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { withMinistry } = useAdminMinistry();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: schedules } = useSchedules();
  const { data: profiles } = useProfiles();
  const { data: notifications, isLoading: isLoadingNotifications } = useNotifications(user?.id);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
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
    () => upcomingSchedules.find((s) => s.id === selectedScheduleId) ?? null,
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

  const unreadNotifications = useMemo(
    () => (notifications ?? []).filter((n) => !n.read),
    [notifications],
  );

  const recipientCount = useMemo(() => {
    if (selectedSchedule) {
      const ids = (selectedSchedule.members ?? [])
        .map((m) => m.profile?.user_id)
        .filter(Boolean);
      return new Set(ids).size;
    }
    return new Set((profiles ?? []).map((p) => p.user_id)).size;
  }, [selectedSchedule, profiles]);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setSelectedScheduleId('');
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);

    try {
      let userIds: string[];

      if (selectedSchedule) {
        userIds = Array.from(
          new Set(
            (selectedSchedule.members ?? [])
              .map((m) => m.profile?.user_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
      } else {
        userIds = Array.from(new Set((profiles ?? []).map((p) => p.user_id)));
      }

      for (const userId of userIds) {
        await createNotificationMutation.mutateAsync({
          user_id: userId,
          title,
          message,
          type: 'announcement',
          schedule_id: selectedSchedule?.id,
        });
      }

      toast({
        title: 'Notificação enviada',
        description: selectedSchedule
          ? `Enviada para ${userIds.length} membro(s) da escala.`
          : `Enviada para todos os ${userIds.length} membros.`,
      });

      resetForm();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao enviar notificação.';
      toast({ title: 'Erro ao enviar', description: msg, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenNotification = (notification: {
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
    if (action) navigate(action.href);
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => toast({ title: 'Todas as notificações marcadas como lidas' }),
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Notificações" description="Envie avisos e acompanhe solicitações da equipe" />

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-4 w-4 text-primary-strong" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Não lidas</p>
            <p className="text-xl font-semibold text-foreground">{unreadNotifications.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <AlertTriangle className="h-4 w-4 text-primary-strong" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Solicitações</p>
            <p className="text-xl font-semibold text-foreground">{pendingChangeRequests.length}</p>
          </div>
        </div>

        <div className="col-span-2 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:col-span-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary-strong" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Membros ativos</p>
            <p className="text-xl font-semibold text-foreground">{(profiles ?? []).length}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="send" className="min-w-0 space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm">
          <TabsTrigger value="send" className="shrink-0 gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary-strong">
            <Send className="h-4 w-4" />
            Enviar
          </TabsTrigger>
          <TabsTrigger value="requests" className="shrink-0 gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary-strong">
            <AlertTriangle className="h-4 w-4" />
            Solicitações
            {pendingChangeRequests.length > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {pendingChangeRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="shrink-0 gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary-strong">
            <Bell className="h-4 w-4" />
            Recebidas
            {unreadNotifications.length > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadNotifications.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── SEND ── */}
        <TabsContent value="send" className="space-y-4">
          <Card className="admin-surface">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <MessageSquare className="h-4 w-4 text-primary-strong" />
                Nova notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-title">Título</Label>
                <Input
                  id="notification-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Lembrete de ensaio"
                  className="rounded-xl border-border bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-message">Mensagem</Label>
                <Textarea
                  id="notification-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={4}
                  className="rounded-xl border-border bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label>Destinatários</Label>
                <Select
                  value={selectedScheduleId || 'all'}
                  onValueChange={(v) => setSelectedScheduleId(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="rounded-xl border-border bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os membros</SelectItem>
                    {upcomingSchedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {format(new Date(schedule.schedule_date), "dd 'de' MMMM", { locale: ptBR })}
                        {' — '}
                        {(schedule.members ?? []).length} membro(s)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient preview */}
              <div className={`rounded-xl border p-3 ${selectedSchedule ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/50'}`}>
                <div className="flex items-center gap-2 text-sm">
                  <Users className={`h-4 w-4 ${selectedSchedule ? 'text-primary-strong' : 'text-muted-foreground'}`} />
                  {selectedSchedule ? (
                    <span className="font-medium text-primary-strong">
                      {recipientCount} membro(s) da escala de{' '}
                      {format(new Date(selectedSchedule.schedule_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{recipientCount}</strong> membros receberão esta notificação
                    </span>
                  )}
                </div>
                {selectedSchedule && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(selectedSchedule.members ?? []).map((member) => (
                      <Badge key={member.id} variant="outline" className="border-primary/30 bg-card text-xs text-foreground">
                        {member.profile?.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSend}
                  disabled={!title.trim() || !message.trim() || isSending}
                  className="gap-2"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isSending ? 'Enviando...' : `Enviar para ${recipientCount} pessoa(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── REQUESTS ── */}
        <TabsContent value="requests" className="space-y-4">
          <Card className="admin-surface">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-primary-strong" />
                Solicitações de troca
                {pendingChangeRequests.length > 0 && (
                  <Badge className="ml-auto bg-primary/15 text-primary-strong hover:bg-primary/15">
                    {pendingChangeRequests.length} pendente(s)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingChangeRequests.length > 0 ? (
                <div className="divide-y divide-border">
                  {pendingChangeRequests.map((request, index) => (
                    <div
                      key={`${request.scheduleId}-${request.memberName}-${index}`}
                      className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{request.memberName}</p>
                          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {request.functionType}
                            {request.functionDetail ? ` · ${request.functionDetail}` : ''}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>
                            {format(new Date(request.scheduleDate), "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                        {request.reason && (
                          <p className="mt-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary-strong">
                            "{request.reason}"
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 rounded-xl border-border"
                        onClick={() => navigate(withMinistry(`/admin-app/schedules/${request.scheduleId}`))}
                      >
                        Ver escala
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <CheckCheck className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Nenhuma solicitação pendente</p>
                  <p className="text-sm text-muted-foreground">Quando membros pedirem troca aparecerá aqui</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RECEIVED ── */}
        <TabsContent value="received" className="space-y-4">
          <Card className="admin-surface">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Bell className="h-4 w-4 text-primary-strong" />
                  Recebidas
                </CardTitle>
                {unreadNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleMarkAllRead}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    {markAllAsReadMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5" />
                    )}
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingNotifications ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (notifications ?? []).length > 0 ? (
                <div className="divide-y divide-border">
                  {(notifications ?? []).map((notification) => {
                    const action = getAdminNotificationAction(notification);

                    return (
                      <div
                        key={notification.id}
                        className={`group flex cursor-pointer items-start gap-3 py-4 transition-colors first:pt-0 last:pb-0 hover:bg-muted ${!notification.read ? 'relative' : ''}`}
                        onClick={() => handleOpenNotification(notification)}
                      >
                        {/* Unread dot */}
                        {!notification.read && (
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                        {notification.read && <span className="mt-2 h-1.5 w-1.5 shrink-0" />}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm font-medium ${notification.read ? 'text-foreground' : 'text-foreground'}`}>
                              {notification.title}
                            </p>
                            <TypeBadge type={notification.type} />
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
                          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(notification.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {action && (
                              <>
                                <span className="mx-1">·</span>
                                <span className="text-primary-strong">{action.label}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {action && (
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <BellOff className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Nenhuma notificação</p>
                  <p className="text-sm text-muted-foreground">Suas notificações aparecerão aqui</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
