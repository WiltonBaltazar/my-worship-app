import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateScheduleDialog } from '@/components/admin/CreateScheduleDialog';
import { EditScheduleDialog } from '@/components/admin/EditScheduleDialog';
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
import { type Schedule, useDeleteSchedule, useSchedules, useUpdateSchedule } from '@/hooks/useSchedules';

const statusLabelMap: Record<Schedule['status'], string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  confirmed: 'Confirmado',
};

const functionLabelMap: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

function formatScheduleDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  const formatted = format(parsed, "EEEE, d 'de' MMMM", { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function statusBadgeClass(status: Schedule['status']) {
  if (status === 'published') {
    return 'bg-success text-success-foreground';
  }

  if (status === 'confirmed') {
    return '';
  }

  return 'bg-secondary text-secondary-foreground';
}

export default function AdminSchedules() {
  const navigate = useNavigate();

  const { data: schedules, isLoading } = useSchedules();
  const updateScheduleMutation = useUpdateSchedule();
  const deleteScheduleMutation = useDeleteSchedule();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);

  const worshipSchedules = useMemo(() => {
    return (schedules ?? []).filter((schedule) => schedule.schedule_type !== 'rehearsal');
  }, [schedules]);

  const handlePublish = async (schedule: Schedule) => {
    try {
      await updateScheduleMutation.mutateAsync({ id: schedule.id, status: 'published' });
    } catch {
      // Toast is handled by hook.
    }
  };

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

      <div className="space-y-4">
        {worshipSchedules.map((schedule) => {
          const members = schedule.members ?? [];
          const songs = schedule.songs ?? [];
          const confirmedCount = members.filter((member) => member.confirmed).length;
          const requestCount = members.filter((member) => member.requested_change).length;

          return (
            <Card key={schedule.id} className="admin-surface">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-primary">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-xl text-slate-900 lg:text-2xl">{formatScheduleDate(schedule.schedule_date)}</CardTitle>
                      {schedule.title && <p className="mt-1 text-sm text-slate-500 lg:text-base">{schedule.title}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={statusBadgeClass(schedule.status)}>
                          {statusLabelMap[schedule.status]}
                        </Badge>
                        {requestCount > 0 && (
                          <Badge variant="outline" className="border-orange-400 text-orange-700">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {requestCount} solicitação(ões)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin-app/schedules/${schedule.id}`)}>
                      <Eye className="mr-1 h-4 w-4" />
                      Ver
                    </Button>
                    {schedule.status === 'draft' && members.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => handlePublish(schedule)}>
                        Publicar
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEditingScheduleId(schedule.id)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingSchedule(schedule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-6 text-slate-500">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{members.length} membros escalados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>{confirmedCount} confirmados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{songs.length} músicas</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-2 font-medium text-slate-900">Equipe:</p>
                  {members.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => (
                        <Badge
                          key={member.id}
                          variant={member.confirmed ? 'default' : 'secondary'}
                          className={member.confirmed ? 'whitespace-normal break-words bg-orange-50 text-orange-700' : 'whitespace-normal break-words'}
                        >
                          {member.profile?.name} - {functionLabelMap[member.function_type] || member.function_type}
                          {member.function_detail ? ` - ${member.function_detail}` : ''}
                          {member.confirmed && <Check className="ml-1 h-3 w-3" />}
                          {member.requested_change && <AlertTriangle className="ml-1 h-3 w-3" />}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum membro escalado ainda. Clique em "Editar" para adicionar.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {worshipSchedules.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            Nenhuma escala criada ainda.
          </div>
        )}
      </div>

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
