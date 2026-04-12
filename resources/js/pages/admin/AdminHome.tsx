import { format, isFuture, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Guitar, Loader2, Mic2, Music, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useMarkAsRead, useNotifications } from '@/hooks/useNotifications';
import { useProfiles } from '@/hooks/useProfiles';
import { useSchedules } from '@/hooks/useSchedules';
import { useSongs } from '@/hooks/useSongs';
import { cn } from '@/lib/utils';

const instrumentLabels: Record<string, string> = {
  guitar: 'Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  acoustic_guitar: 'Violão',
  violin: 'Violino',
  percussion: 'Percussão',
  sound_tech: 'Técnico de Som',
  other: 'Outro',
};

const voiceLabels: Record<string, string> = {
  lead: 'Voz Principal (Dirigente)',
  soprano: 'Primeira Voz (Soprano)',
  alto: 'Segunda Voz (Alto/Contralto)',
  tenor: 'Terceira Voz (Tenor)',
  bass_voice: 'Voz Grave (Baixo)',
};

export default function AdminHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: schedules, isLoading: loadingSchedules } = useSchedules();
  const { data: songs, isLoading: loadingSongs } = useSongs();
  const { data: notifications } = useNotifications(user?.id);
  const markAsReadMutation = useMarkAsRead();

  const isLoading = loadingProfiles || loadingSchedules || loadingSongs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const instrumentStats: Record<string, number> = {};
  profiles?.forEach((profile) => {
    profile.instruments?.forEach((instrument) => {
      instrumentStats[instrument] = (instrumentStats[instrument] || 0) + 1;
    });
  });

  const voiceStats: Record<string, number> = {};
  profiles?.forEach((profile) => {
    profile.voices?.forEach((voice) => {
      voiceStats[voice] = (voiceStats[voice] || 0) + 1;
    });
  });

  const upcomingSchedules = (schedules ?? []).filter((schedule) => {
    const date = new Date(schedule.schedule_date);
    return isFuture(date) || isToday(date);
  });

  const thisMonthSchedules = upcomingSchedules.filter((schedule) => {
    const date = new Date(schedule.schedule_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const totalConfirmed = upcomingSchedules.reduce(
    (accumulator, schedule) => {
      const confirmed = schedule.members?.filter((member) => member.confirmed).length || 0;
      const total = schedule.members?.length || 0;
      return {
        confirmed: accumulator.confirmed + confirmed,
        total: accumulator.total + total,
      };
    },
    { confirmed: 0, total: 0 },
  );

  const confirmationRate = totalConfirmed.total > 0 ? Math.round((totalConfirmed.confirmed / totalConfirmed.total) * 100) : 0;
  const nextSchedule = upcomingSchedules[0];

  const stats = [
    {
      title: 'Membros Ativos',
      value: profiles?.length || 0,
      icon: Users,
      change: `${profiles?.filter((profile) => profile.can_lead).length || 0} podem liderar`,
      color: 'text-primary',
    },
    {
      title: 'Escalas do Mês',
      value: thisMonthSchedules.length,
      icon: Calendar,
      change: nextSchedule ? `Próxima: ${format(new Date(nextSchedule.schedule_date), 'dd/MM', { locale: ptBR })}` : 'Nenhuma',
      color: 'text-success',
    },
    {
      title: 'Músicas no Repertório',
      value: songs?.length || 0,
      icon: Music,
      change: 'Total cadastradas',
      color: 'text-accent',
    },
    {
      title: 'Confirmações',
      value: `${confirmationRate}%`,
      icon: TrendingUp,
      change: `${totalConfirmed.confirmed}/${totalConfirmed.total} membros`,
      color: 'text-primary',
    },
  ];

  const changeRequests = upcomingSchedules.flatMap(
    (schedule) =>
      schedule.members
        ?.filter((member) => member.requested_change)
        .map((member) => ({
          scheduleId: schedule.id,
          scheduleDate: schedule.schedule_date,
          memberName: member.profile?.name,
          reason: member.change_reason,
        })) || [],
  );

  const handleOpenChangeRequest = (scheduleId: string) => {
    const relatedUnreadNotifications = (notifications ?? []).filter(
      (notification) => notification.type === 'change_request' && notification.schedule_id === scheduleId && !notification.read,
    );

    relatedUnreadNotifications.forEach((notification) => {
      markAsReadMutation.mutate(notification.id);
    });

    navigate(`/admin-app/schedules/${scheduleId}`);
  };

  return (
    <div className="space-y-7">
      <header className="admin-surface border-l-4 border-l-orange-500 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Painel administrativo</p>
        <h1 className="mt-2 admin-page-title">Dashboard</h1>
        <p className="mt-1 admin-page-description">Visão geral do ministério de louvor</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="admin-surface">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{stat.title}</CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  <Icon className={cn('h-5 w-5', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">{stat.value}</div>
                <p className="mt-1 text-sm text-slate-500">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="admin-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Guitar className="h-5 w-5 text-primary" />
              Membros por Instrumento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(instrumentStats).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(instrumentStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([instrument, count]) => (
                    <Badge key={instrument} variant="secondary" className="px-3 py-1 text-sm">
                      {instrumentLabels[instrument] || instrument}: <span className="ml-1 font-bold">{count}</span>
                    </Badge>
                  ))}
              </div>
            ) : (
              <p className="py-4 text-center text-muted-foreground">Nenhum instrumento cadastrado</p>
            )}
          </CardContent>
        </Card>

        <Card className="admin-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic2 className="h-5 w-5 text-primary" />
              Membros por Voz
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(voiceStats).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(voiceStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([voice, count]) => (
                    <Badge key={voice} variant="secondary" className="px-3 py-1 text-sm">
                      {voiceLabels[voice] || voice}: <span className="ml-1 font-bold">{count}</span>
                    </Badge>
                  ))}
              </div>
            ) : (
              <p className="py-4 text-center text-muted-foreground">Nenhuma voz cadastrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="admin-surface">
          <CardHeader>
            <CardTitle className="text-lg">Solicitações de Troca</CardTitle>
          </CardHeader>
          <CardContent>
            {changeRequests.length > 0 ? (
              <ul className="space-y-4">
                {changeRequests.slice(0, 5).map((request, index) => (
                  <li
                    key={`${request.memberName}-${index}`}
                    className="admin-surface-muted flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <span className="font-medium text-slate-900">{request.memberName}</span>
                      <p className="text-sm text-slate-500">
                        Escala: {format(new Date(request.scheduleDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      {request.reason && <p className="mt-1 text-sm text-accent">"{request.reason}"</p>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-end sm:self-auto"
                      onClick={() => handleOpenChangeRequest(request.scheduleId)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Abrir
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-muted-foreground">Nenhuma solicitação pendente</p>
            )}
          </CardContent>
        </Card>

        <Card className="admin-surface">
          <CardHeader>
            <CardTitle className="text-lg">Próximas Escalas</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSchedules.length > 0 ? (
              <div className="space-y-3">
                {upcomingSchedules.slice(0, 4).map((schedule) => {
                  const confirmed = schedule.members?.filter((member) => member.confirmed).length || 0;
                  const total = schedule.members?.length || 0;

                  return (
                    <div
                      key={schedule.id}
                      className="admin-surface-muted flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {format(new Date(schedule.schedule_date), "dd 'de' MMM", { locale: ptBR })}
                          </p>
                          <p className="text-sm text-slate-500">{total} membros escalados</p>
                        </div>
                      </div>

                      <div className="self-end text-right sm:self-auto">
                        <p className="font-medium text-slate-900">
                          {confirmed}/{total}
                        </p>
                        <p className="text-sm text-slate-500">confirmados</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-muted-foreground">Nenhuma escala próxima</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
