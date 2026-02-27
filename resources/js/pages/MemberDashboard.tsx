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
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MemberDashboard() {
  const { profile, isAdmin, isLeader, user } = useAuth();
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

  // Find the next upcoming schedule
  const upcomingSchedules = schedules?.filter(s => {
    const date = new Date(s.schedule_date);
    return isFuture(date) || isToday(date);
  }) || [];

  const nextSchedule = upcomingSchedules[0];
  const myMembership = nextSchedule?.members?.find(m => m.profile_id === profile?.id);

  const handleViewSongDetails = (songId: string) => {
    setSelectedSongId(songId);
    setSongDetailOpen(true);
  };

  const formatUpcomingSchedules = () => {
    // Skip the first one since it's shown as the main card
    return upcomingSchedules.slice(1, 6).map(schedule => {
      const myRole = schedule.members?.find(m => m.profile_id === profile?.id);
      return {
        id: schedule.id,
        date: new Date(schedule.schedule_date),
        role: myRole?.function_detail || (
          myRole?.function_type === 'lead_vocal' ? 'Vocal Principal' : 
          myRole?.function_type === 'backing_vocal' ? 'Backing Vocal' : 
          myRole?.function_type === 'sound_tech' ? 'Técnico de Som' :
          'Instrumentista'
        ),
        isScheduled: !!myRole,
        schedule
      };
    });
  };

  const selectedSong = selectedSongId ? songs?.find(s => s.id === selectedSongId) || null : null;

  return (
    <div className="page-container">
      <Header 
        userName={profile?.name || 'Usuário'} 
        avatarUrl={profile?.avatar_url || undefined}
        notificationCount={unreadCount || 0}
      />
      
      <div className="space-y-6">
        {/* Admin link - only shown to admins/leaders */}
        {(isAdmin || isLeader) && (
          <a href="/admin-app/schedules" className="block animate-fade-in">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Acessar área administrativa
            </Button>
          </a>
        )}

        {nextSchedule ? (
          <>
            <NextScheduleCard 
              schedule={nextSchedule}
              myMembership={myMembership}
            />
            
            {nextSchedule.songs && nextSchedule.songs.length > 0 && (
              <RepertoireCard 
                songs={nextSchedule.songs.map(s => ({
                  id: s.song?.id || s.song_id,
                  title: s.song?.title || 'Música'
                }))}
                onViewDetails={handleViewSongDetails}
              />
            )}
          </>
        ) : (
          <div className="repertoire-card text-center py-8">
            <p className="text-muted-foreground">Você não tem escalas próximas.</p>
          </div>
        )}
        
        {formatUpcomingSchedules().length > 0 && (
          <UpcomingSchedules schedules={formatUpcomingSchedules()} />
        )}
      </div>

      <SongDetailDialog
        song={selectedSong}
        open={songDetailOpen}
        onOpenChange={setSongDetailOpen}
      />
      
      <BottomNav />
    </div>
  );
}
