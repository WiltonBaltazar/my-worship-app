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
      <div className="flex items-center justify-center py-12">
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
      color: 'text-orange-700',
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
      (notification) =>
        notification.type === 'change_request'
        && notification.schedule_id === scheduleId
        && !notification.read,
    );

    relatedUnreadNotifications.forEach((notification) => {
      markAsReadMutation.mutate(notification.id);
    });

    navigate(`/admin-app/schedules/${scheduleId}`);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do ministério de louvor</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-none shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={cn('h-5 w-5', stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="mt-1 text-sm text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-soft">
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

        <Card className="border-none shadow-soft">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Solicitações de Troca</CardTitle>
          </CardHeader>
          <CardContent>
            {changeRequests.length > 0 ? (
              <ul className="space-y-4">
                {changeRequests.slice(0, 5).map((request, index) => (
                  <li key={`${request.memberName}-${index}`} className="flex items-start justify-between border-b border-border pb-3 last:border-0">
                    <div>
                      <span className="font-medium text-foreground">{request.memberName}</span>
                      <p className="text-sm text-muted-foreground">
                        Escala: {format(new Date(request.scheduleDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      {request.reason && <p className="mt-1 text-sm text-orange-700">"{request.reason}"</p>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
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

        <Card className="border-none shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Próximas Escalas</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSchedules.length > 0 ? (
              <div className="space-y-4">
                {upcomingSchedules.slice(0, 4).map((schedule) => {
                  const confirmed = schedule.members?.filter((member) => member.confirmed).length || 0;
                  const total = schedule.members?.length || 0;

                  return (
                    <div key={schedule.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {format(new Date(schedule.schedule_date), "dd 'de' MMM", { locale: ptBR })}
                          </p>
                          <p className="text-sm text-muted-foreground">{total} membros escalados</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {confirmed}/{total}
                        </p>
                        <p className="text-sm text-muted-foreground">confirmados</p>
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
