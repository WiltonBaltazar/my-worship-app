import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, LayoutGrid, List, Loader2, Plus, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateScheduleDialog } from '@/components/admin/CreateScheduleDialog';
import { EditScheduleDialog } from '@/components/admin/EditScheduleDialog';
import {
  ScheduleCalendarView,
  ScheduleCardsView,
  ScheduleGridView,
  ScheduleListView,
  type ScheduleViewMode,
  type ScheduleViewProps,
} from '@/components/admin/ScheduleViews';
import { UnavailableMembersList } from '@/components/admin/UnavailableMembersList';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type Schedule, useDeleteSchedule, usePublishSchedule, useSchedules } from '@/hooks/useSchedules';
import { MINISTRY_LABELS, type Ministry } from '@/lib/ministry';

const VIEW_MODE_STORAGE_KEY = 'wora:admin-schedules-view';

const viewModeOptions: Array<{ value: ScheduleViewMode; label: string; icon: typeof List }> = [
  { value: 'list', label: 'Lista', icon: List },
  { value: 'cards', label: 'Cartões', icon: Rows3 },
  { value: 'grid', label: 'Grade', icon: LayoutGrid },
  { value: 'calendar', label: 'Calendário', icon: CalendarDays },
];

function readStoredViewMode(): ScheduleViewMode {
  try {
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (viewModeOptions.some((option) => option.value === stored)) {
      return stored as ScheduleViewMode;
    }
  } catch {
    // Storage can be unavailable (private mode); fall back to the default view.
  }

  return 'list';
}

export default function AdminSchedules() {
  const navigate = useNavigate();
  const { ledMinistries, canManageMinistry } = useAuth();
  const [ministryFilter, setMinistryFilter] = useState<'all' | Ministry>('all');

  const { data: schedules, isLoading } = useSchedules();
  const { publish: handlePublish } = usePublishSchedule();
  const deleteScheduleMutation = useDeleteSchedule();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>(readStoredViewMode);

  const changeViewMode = (mode: ScheduleViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Not persisting the preference is fine.
    }
  };

  const worshipSchedules = useMemo(() => {
    return (schedules ?? [])
      .filter(
        (schedule) => schedule.schedule_type !== 'rehearsal'
          && (ministryFilter === 'all' || schedule.ministry === ministryFilter),
      )
      .sort((a, b) =>
        b.schedule_date.localeCompare(a.schedule_date)
        || (b.start_time ?? '').localeCompare(a.start_time ?? ''));
  }, [schedules, ministryFilter]);

  const handleDelete = async () => {
    if (!deletingSchedule) {
      return;
    }

    try {
      await deleteScheduleMutation.mutateAsync(deletingSchedule.id);
      setDeletingSchedule(null);
    } catch {
      // Toast is handled by hook.
    }
  };

  const viewProps: ScheduleViewProps = {
    schedules: worshipSchedules,
    canManage: (schedule) => canManageMinistry(schedule.ministry),
    onView: (schedule) => navigate(`/admin-app/schedules/${schedule.id}`),
    onEdit: (schedule) => setEditingScheduleId(schedule.id),
    onDelete: setDeletingSchedule,
    onPublish: handlePublish,
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="admin-page-title">Escalas</h1>
          <p className="admin-page-description">Crie e gerencie escalas de culto</p>
        </div>

        <Button className="h-11 w-full rounded-xl px-5 sm:w-auto" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-5 w-5" />
          Nova Escala
        </Button>
      </div>

      <UnavailableMembersList
        description="Verifique antes de escalar — datas em que membros não podem servir."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {ledMinistries.length > 1 && (
          <ToggleGroup
            type="single"
            variant="outline"
            value={ministryFilter}
            onValueChange={(value) => value && setMinistryFilter(value as 'all' | Ministry)}
            className="justify-start"
          >
            <ToggleGroupItem value="all" className="rounded-xl bg-white px-4">Todas</ToggleGroupItem>
            {ledMinistries.map((ministry) => (
              <ToggleGroupItem key={ministry} value={ministry} className="rounded-xl bg-white px-4">
                {MINISTRY_LABELS[ministry]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}

        <ToggleGroup
          type="single"
          variant="outline"
          value={viewMode}
          onValueChange={(value) => value && changeViewMode(value as ScheduleViewMode)}
          className="justify-start sm:ml-auto"
          aria-label="Modo de visualização"
        >
          {viewModeOptions.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} className="gap-1.5 rounded-xl bg-white px-3" aria-label={label}>
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {worshipSchedules.length > 0 ? (
        <>
          {viewMode === 'cards' && <ScheduleCardsView {...viewProps} />}
          {viewMode === 'list' && <ScheduleListView {...viewProps} />}
          {viewMode === 'grid' && <ScheduleGridView {...viewProps} />}
          {viewMode === 'calendar' && <ScheduleCalendarView {...viewProps} />}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Nenhuma escala criada ainda.
        </div>
      )}

      <CreateScheduleDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

      <EditScheduleDialog
        scheduleId={editingScheduleId}
        open={editingScheduleId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingScheduleId(null);
          }
        }}
      />

      <AlertDialog open={deletingSchedule !== null} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Escala?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A escala será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
