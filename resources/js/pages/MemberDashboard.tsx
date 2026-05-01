import { useState } from 'react';
import { format, isFuture, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { NextScheduleCard } from '@/components/schedule/NextScheduleCard';
import { RepertoireCard } from '@/components/schedule/RepertoireCard';
import { UpcomingSchedules } from '@/components/schedule/UpcomingSchedules';
import { SongDetailDialog } from '@/components/schedule/SongDetailDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchedules } from '@/hooks/useSchedules';
import { useSongs } from '@/hooks/useSongs';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { CalendarCheck2, Loader2, Shield, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MemberDashboard() {
  const { profile, isAdmin, isLeader, isSoundTechManager, user } = useAuth();
  const { data: schedules, isLoading } = useMySchedules(profile?.id);
  const { data: songs } = useSongs();
  const { data: unreadCount } = useUnreadNotificationCount(user?.id);

  const [songDetailOpen, setSongDetailOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const upcomingSchedules =
    schedules?.filter((schedule) => {
      const date = new Date(schedule.schedule_date);
      return isFuture(date) || isToday(date);
    }) || [];

  const nextSchedule = upcomingSchedules[0];
  const myMembership = nextSchedule?.members?.find((member) => member.profile_id === profile?.id);

  const handleViewSongDetails = (songId: string) => {
    setSelectedSongId(songId);
    setSongDetailOpen(true);
  };

  const formatUpcomingSchedules = () => {
    return upcomingSchedules.slice(1, 6).map((schedule) => {
      const myRole = schedule.members?.find((member) => member.profile_id === profile?.id);
      return {
        id: schedule.id,
        date: new Date(schedule.schedule_date),
        role:
          myRole?.function_detail ||
          (myRole?.function_type === 'lead_vocal'
            ? 'Vocal Principal'
            : myRole?.function_type === 'backing_vocal'
              ? 'Backing Vocal'
              : myRole?.function_type === 'sound_tech'
                ? 'Técnico de Som'
                : 'Instrumentista'),
        isScheduled: !!myRole,
        schedule,
      };
    });
  };

  const selectedSong = selectedSongId ? songs?.find((song) => song.id === selectedSongId) || null : null;
  const technicalSchedulePath = isAdmin || isLeader ? '/admin-app/tech-schedules' : '/tech-schedules';

  const summaryDate = nextSchedule
    ? format(new Date(`${nextSchedule.schedule_date}T${nextSchedule.start_time || '11:00'}`), "dd 'de' MMMM", {
        locale: ptBR,
      })
    : 'Sem escala próxima';

  return (
    <div className="page-container">
      <Header
        userName={profile?.name || 'Usuário'}
        avatarUrl={profile?.avatar_url || undefined}
        notificationCount={unreadCount || 0}
      />

      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[1.8rem] border border-border/65 bg-card/95 p-5 shadow-card animate-slide-up sm:p-6">
          <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-14 h-36 w-36 rounded-full bg-accent/18 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Painel do dia</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Tudo pronto para o próximo culto</h1>
              <p className="mt-2 text-sm text-muted-foreground">{upcomingSchedules.length} escala(s) futura(s) para acompanhar.</p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/58 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Próxima data</p>
              <p className="mt-1 text-sm font-semibold capitalize text-foreground">{summaryDate}</p>
            </div>
          </div>
        </section>

        {(isAdmin || isLeader || isSoundTechManager) && (
          <section className="grid gap-3 sm:grid-cols-2 animate-fade-in">
            {(isAdmin || isLeader) && (
              <a href="/admin-app/schedules" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 rounded-2xl">
                  <Shield className="h-4 w-4 text-primary" />
                  Acessar área administrativa
                </Button>
              </a>
            )}

            {isSoundTechManager && (
              <a href={technicalSchedulePath} className="block">
                <Button variant="outline" className="w-full justify-start gap-2 rounded-2xl">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Gerenciar escala técnica
                </Button>
              </a>
            )}
          </section>
        )}

        {nextSchedule ? (
          <>
            <NextScheduleCard schedule={nextSchedule} myMembership={myMembership} />

            {nextSchedule.songs && nextSchedule.songs.length > 0 && (
              <RepertoireCard
                songs={nextSchedule.songs.map((song) => ({
                  id: song.song?.id || song.song_id,
                  title: song.song?.title || 'Música',
                }))}
                onViewDetails={handleViewSongDetails}
              />
            )}
          </>
        ) : (
          <div className="repertoire-card py-9 text-center animate-fade-in">
            <CalendarCheck2 className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="text-muted-foreground">Você não tem escalas próximas.</p>
          </div>
        )}

        {formatUpcomingSchedules().length > 0 && <UpcomingSchedules schedules={formatUpcomingSchedules()} />}
      </div>

      <SongDetailDialog song={selectedSong} open={songDetailOpen} onOpenChange={setSongDetailOpen} />

      <BottomNav />
    </div>
  );
}
