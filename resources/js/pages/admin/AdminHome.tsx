import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateScheduleDialog } from '@/components/admin/CreateScheduleDialog';
import { ActivityCard, RepertoireCard, RotationCard, TeamCoverageCard } from '@/components/admin/dashboard/InsightCards';
import { SwapRequestsCard, UnavailableThisWeekCard, UpcomingSchedulesCard } from '@/components/admin/dashboard/ScheduleCards';
import { AttentionTiles, KpiTiles } from '@/components/admin/dashboard/StatTiles';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminMinistry } from '@/hooks/useAdminMinistry';
import { useMarkAsRead, useNotifications } from '@/hooks/useNotifications';
import { usePendingProfilesCount, useProfiles } from '@/hooks/useProfiles';
import { useSchedules } from '@/hooks/useSchedules';
import { useSongs } from '@/hooks/useSongs';
import { buildDashboardData, rotation, scopedProfiles, songUsage, unavailableThisWeek } from '@/lib/adminDashboard';
import { MINISTRY_LABELS } from '@/lib/ministry';

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando dashboard">
      <Skeleton className="h-14 w-72" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-xl xl:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();
  const { user, isLeader } = useAuth();
  const { ministry, withMinistry } = useAdminMinistry();
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: schedules, isLoading: loadingSchedules } = useSchedules();
  const { data: songs, isLoading: loadingSongs } = useSongs();
  const { data: notifications } = useNotifications(user?.id);
  const { data: pendingUsers = 0 } = usePendingProfilesCount(user?.id, isLeader);
  const markAsReadMutation = useMarkAsRead();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const view = useMemo(() => {
    if (!profiles || !schedules) {
      return null;
    }

    return {
      data: buildDashboardData(schedules, profiles, ministry),
      members: scopedProfiles(profiles, ministry),
      rotation: rotation(schedules, profiles, ministry),
      songs: songUsage(schedules, songs?.length ?? 0, ministry),
      unavailable: unavailableThisWeek(profiles, ministry),
    };
  }, [profiles, schedules, songs, ministry]);

  if (loadingProfiles || loadingSchedules || loadingSongs || !view) {
    return <DashboardSkeleton />;
  }

  const now = new Date();
  const firstName = user?.name?.split(' ')[0];
  const ministryLabel = ministry === 'all' ? '' : ` · ${MINISTRY_LABELS[ministry]}`;

  const handleOpenChangeRequest = (scheduleId: string) => {
    (notifications ?? [])
      .filter((notification) => notification.type === 'change_request' && notification.schedule_id === scheduleId && !notification.read)
      .forEach((notification) => markAsReadMutation.mutate(notification.id));

    navigate(`/admin-app/schedules/${scheduleId}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="admin-page-title">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="admin-page-description first-letter:uppercase">
            {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
            {ministryLabel}
          </p>
        </div>
        <Button className="h-10 rounded-lg px-4 font-semibold max-sm:w-full" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nova escala
        </Button>
      </header>

      <AttentionTiles attention={view.data.attention} pendingUsers={pendingUsers} withMinistry={withMinistry} />

      <KpiTiles data={view.data} ministryLabel={ministryLabel} />

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <UpcomingSchedulesCard
          schedules={view.data.upcoming}
          warnings={view.data.leaderlessSoon}
          allLink={withMinistry('/admin-app/schedules')}
          className="xl:col-span-2"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <UnavailableThisWeekCard entries={view.unavailable} allLink={withMinistry('/admin-app/availability')} />
          <SwapRequestsCard requests={view.data.swapRequests} onOpen={handleOpenChangeRequest} />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <TeamCoverageCard profiles={view.members} />
        <RotationCard most={view.rotation.most} least={view.rotation.least} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <RepertoireCard top={view.songs.top} unused={view.songs.unused} repertoireLink={withMinistry('/admin-app/repertoire')} />
        <ActivityCard items={notifications ?? []} notificationsLink={withMinistry('/admin-app/notifications')} />
      </div>

      <CreateScheduleDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  );
}
