import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Loader2,
  Music2,
  Send,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { AvailabilityCallPanel } from '@/components/admin/AvailabilityCallPanel';
import { EditScheduleDialog } from '@/components/admin/EditScheduleDialog';
import { MinistryBadge } from '@/components/schedule/MinistryBadge';
import { ScheduleGuests } from '@/components/schedule/ScheduleGuests';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteSchedule, usePublishSchedule, useSchedules } from '@/hooks/useSchedules';
import { useLeaderDenyChangeRequest, useAcceptSubstituteRequest } from '@/hooks/useSubstituteRequests';

const functionLabelMap: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

const statusLabelMap: Record<'draft' | 'published' | 'confirmed', string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  confirmed: 'Confirmado',
};

export default function AdminScheduleDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: schedules, isLoading } = useSchedules();
  const { canManageMinistry } = useAuth();
  const deleteScheduleMutation = useDeleteSchedule();
  const { publish, isPending: isPublishing } = usePublishSchedule();
  const leaderDenyMutation = useLeaderDenyChangeRequest();
  const acceptSubstituteRequestMutation = useAcceptSubstituteRequest();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const schedule = schedules?.find((item) => item.id === id) ?? null;

  const handleDelete = async () => {
    if (!schedule) {
      return;
    }

    try {
      await deleteScheduleMutation.mutateAsync(schedule.id);
      setIsDeleteDialogOpen(false);
      navigate('/admin-app/schedules');
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

  if (!schedule) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/admin-app/schedules')} className="-ml-2 mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Escala não encontrada.</p>
      </div>
    );
  }

  const formattedDate = format(new Date(`${schedule.schedule_date}T00:00:00`), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
  const readableDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const canManage = canManageMinistry(schedule.ministry);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin-app/schedules')} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {canManage && (
          <div className="flex w-full gap-2 sm:w-auto">
            {schedule.status === 'draft' && (
              <Button className="flex-1 sm:flex-none" onClick={() => publish(schedule)} disabled={isPublishing}>
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Publicar
              </Button>
            )}
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsEditDialogOpen(true)}>
              Editar
            </Button>
            <Button variant="destructive" className="flex-1 sm:flex-none" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        )}
      </div>

      <header className="space-y-1">
        <h1 className="admin-page-title">Detalhes da Escala</h1>
        <p className="admin-page-description">Visualize membros, confirmações e repertório.</p>
      </header>

      <div className="space-y-6">
        <div className="admin-surface p-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <p className="text-xl font-semibold text-foreground">{readableDate}</p>
          </div>
          {schedule.title && <p className="mt-1 font-medium text-foreground">{schedule.title}</p>}
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{schedule.start_time?.slice(0, 5) ?? '11:00'}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <MinistryBadge ministry={schedule.ministry} />
            <Badge className={schedule.status === 'published' ? 'bg-success text-success-foreground' : ''}>
              {statusLabelMap[schedule.status]}
            </Badge>
          </div>
          {schedule.notes && <p className="mt-3 text-muted-foreground">{schedule.notes}</p>}
        </div>

        {canManage && <AvailabilityCallPanel schedule={schedule} />}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Equipe ({schedule.members?.length ?? 0})</h2>
          </div>
          <div className="space-y-2">
            {(schedule.members ?? []).map((member) => (
              <div key={member.id} className="admin-surface-muted p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {member.profile?.avatar_url ? (
                        <img src={member.profile.avatar_url} alt={member.profile.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{member.profile?.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {functionLabelMap[member.function_type] || member.function_type}
                        {member.function_detail ? ` - ${member.function_detail}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {member.confirmed && (
                      <Badge className="bg-success/10 text-success">
                        <Check className="mr-1 h-3 w-3" />
                        Confirmado
                      </Badge>
                    )}
                    {member.requested_change && (
                      <Badge variant="outline" className="border-primary/60 text-primary-strong">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Troca solicitada
                      </Badge>
                    )}
                  </div>
                </div>

                {member.requested_change && (
                  <div className="mt-3 space-y-2 rounded-xl border border-primary/30 bg-primary/10 p-3">
                    <p className="text-xs font-medium text-primary-strong">Gerenciar solicitação de troca</p>
                    {(member.pending_substitute_requests ?? []).length > 0 ? (
                      <div className="space-y-1">
                        {(member.pending_substitute_requests ?? []).map((req) => (
                          <div key={req.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-3.5 w-3.5 text-primary-strong shrink-0" />
                              <span className="text-xs text-primary-strong">{req.candidate_profile?.name ?? 'Candidato'}</span>
                            </div>
                            <button
                              type="button"
                              className="inline-flex h-6 items-center gap-1 rounded-md border border-success/40 bg-card px-2 text-xs font-medium text-success-strong hover:bg-success/10 disabled:opacity-50"
                              onClick={() => acceptSubstituteRequestMutation.mutate({
                                requestId: req.id,
                                scheduleMemberId: member.id,
                                candidateProfileId: req.candidate_profile?.id ?? '',
                                candidateName: req.candidate_profile?.name ?? '',
                                functionType: member.function_type,
                                functionDetail: member.function_detail,
                              })}
                              disabled={acceptSubstituteRequestMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                              Confirmar
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-primary-strong">Nenhum candidato indicado — edite a escala para adicionar um substituto.</p>
                    )}
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-primary/40 bg-card px-2 py-1 text-xs font-medium text-primary-strong hover:bg-primary/15 disabled:opacity-50"
                      onClick={() => leaderDenyMutation.mutate(member.id)}
                      disabled={leaderDenyMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                      Recusar troca
                    </button>
                  </div>
                )}
              </div>
            ))}

            {(schedule.members ?? []).length === 0 && (
              <p className="rounded-2xl border border-dashed border-input p-4 text-center text-muted-foreground">
                Nenhum membro escalado ainda.
              </p>
            )}
          </div>
        </div>

        <Separator />

        <ScheduleGuests scheduleId={schedule.id} ministry={schedule.ministry} guests={schedule.guests ?? []} canManage={canManage} />

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Músicas ({schedule.songs?.length ?? 0})</h2>
          </div>
          <div className="space-y-2">
            {(schedule.songs ?? []).map((scheduleSong, index) => (
              <div key={scheduleSong.id} className="admin-surface-muted flex items-center gap-3 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{scheduleSong.song?.title ?? 'Música sem título'}</p>
                  {scheduleSong.song?.artist && <p className="truncate text-sm text-muted-foreground">{scheduleSong.song.artist}</p>}
                </div>
              </div>
            ))}
            {(schedule.songs ?? []).length === 0 && (
              <p className="rounded-2xl border border-dashed border-input p-4 text-center text-muted-foreground">
                Nenhuma música adicionada ainda.
              </p>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Escala?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A escala será permanentemente removida.
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

      <EditScheduleDialog scheduleId={schedule.id} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
    </div>
  );
}
