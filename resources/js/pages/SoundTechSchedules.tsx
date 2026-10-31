import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Trash2, Wrench } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  type TechnicalScheduleWeek,
  useDeleteTechnicalScheduleWeek,
  useDeleteTechnicalScheduleWeeks,
  useGenerateTechnicalSchedules,
  useTechnicalSchedules,
  useUpdateTechnicalScheduleWeek,
} from '@/hooks/useTechnicalSchedules';
import { type Schedule, useSchedules } from '@/hooks/useSchedules';
import { useToast } from '@/hooks/use-toast';
import { toLocalDateInputValue } from '@/lib/date-time';
import { exportTechnicalAndGeneralSchedulesPdf } from '@/lib/schedule-export';

type WeekDraft = {
  lead_profile_id: string | null;
  sound_profile_id: string | null;
  streaming_profile_id: string | null;
};

type TechnicalScheduleType = 'public_worship' | 'ghj';

function formatWeekDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function SoundTechSchedules() {
  const [startDate, setStartDate] = useState(toLocalDateInputValue());
  const [weeks, setWeeks] = useState(8);
  const [scheduleType, setScheduleType] = useState<TechnicalScheduleType>('public_worship');
  const [draftByWeekKey, setDraftByWeekKey] = useState<Record<string, WeekDraft>>({});
  const [weekToDelete, setWeekToDelete] = useState<TechnicalScheduleWeek | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  const { data, isLoading } = useTechnicalSchedules(startDate, weeks);
  const { data: allGeneralSchedules } = useSchedules();
  const { toast } = useToast();
  const generateMutation = useGenerateTechnicalSchedules();
  const updateWeekMutation = useUpdateTechnicalScheduleWeek();
  const deleteWeekMutation = useDeleteTechnicalScheduleWeek();
  const deleteWeeksMutation = useDeleteTechnicalScheduleWeeks();
  const minStartDate = toLocalDateInputValue();

  const technicians = data?.technicians ?? [];
  const persistedWeeks = data?.weeks ?? [];
  const generalWeeksForExport = 5;

  const generalSchedulesForExport = useMemo(() => {
    const schedules = allGeneralSchedules ?? [];
    const intervalStart = new Date(`${startDate}T00:00:00`);
    const intervalEnd = new Date(intervalStart);
    intervalEnd.setDate(intervalEnd.getDate() + (generalWeeksForExport * 7));

    return schedules
      .filter((schedule: Schedule) => {
        const scheduleDate = new Date(`${schedule.schedule_date}T00:00:00`);
        return scheduleDate >= intervalStart && scheduleDate < intervalEnd;
      })
      .sort((left, right) => left.schedule_date.localeCompare(right.schedule_date));
  }, [allGeneralSchedules, startDate]);

  useEffect(() => {
    if (persistedWeeks.length === 0) {
      return;
    }

    setDraftByWeekKey((previous) => {
      const next = { ...previous };

      for (const week of persistedWeeks) {
        if (!week.id) {
          continue;
        }

        if (next[week.id]) {
          continue;
        }

        next[week.id] = {
          lead_profile_id: week.lead_profile_id,
          sound_profile_id: week.sound_profile_id,
          streaming_profile_id: week.streaming_profile_id,
        };
      }

      return next;
    });
  }, [persistedWeeks]);

  const techniciansByRole = useMemo(() => {
    return {
      lead: technicians.filter((technician) => technician.can_be_tech_lead),
      sound: technicians.filter((technician) => technician.can_be_tech_sound),
      streaming: technicians.filter((technician) => technician.can_be_tech_streaming),
    };
  }, [technicians]);

  const filterTechniciansByScheduleType = (roleTechnicians: typeof technicians, scheduleTypeForWeek: TechnicalScheduleType) => {
    if (scheduleTypeForWeek !== 'ghj') {
      return roleTechnicians;
    }

    return roleTechnicians.filter((technician) => technician.home_group === 'GHJ');
  };

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync({
        start_date: startDate,
        weeks,
        schedule_type: scheduleType,
      });
    } catch {
      // Toast is handled in hook.
    }
  };

  const handleConfirmDeleteAll = async () => {
    const ids = persistedWeeks.map((week) => week.id).filter((id): id is string => Boolean(id));

    if (ids.length === 0) {
      setIsDeleteAllOpen(false);
      return;
    }

    try {
      await deleteWeeksMutation.mutateAsync(ids);
      setDraftByWeekKey({});
      setIsDeleteAllOpen(false);
    } catch {
      // Toast is handled in hook.
    }
  };

  const handleConfirmDeleteWeek = async () => {
    if (!weekToDelete?.id) {
      return;
    }

    try {
      await deleteWeekMutation.mutateAsync(weekToDelete.id);
      const key = keyForWeek(weekToDelete);

      setDraftByWeekKey((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      setWeekToDelete(null);
    } catch {
      // Toast is handled in hook.
    }
  };

  const keyForWeek = (week: TechnicalScheduleWeek): string => week.id ?? week.week_start_date;

  const resolveDraft = (week: TechnicalScheduleWeek): WeekDraft => {
    const key = keyForWeek(week);
    return (
      draftByWeekKey[key] ?? {
        lead_profile_id: week.lead_profile_id,
        sound_profile_id: week.sound_profile_id,
        streaming_profile_id: week.streaming_profile_id,
      }
    );
  };

  const updateDraft = (week: TechnicalScheduleWeek, changes: Partial<WeekDraft>) => {
    const key = keyForWeek(week);

    setDraftByWeekKey((previous) => ({
      ...previous,
      [key]: {
        ...resolveDraft(week),
        ...changes,
      },
    }));
  };

  const handleSaveWeek = async (week: TechnicalScheduleWeek) => {
    if (!week.id) {
      return;
    }

    const draft = resolveDraft(week);
    const weekScheduleType = (week.schedule_type ?? scheduleType) as TechnicalScheduleType;

    try {
      await updateWeekMutation.mutateAsync({
        id: week.id,
        payload: {
          lead_profile_id: draft.lead_profile_id,
          sound_profile_id: draft.sound_profile_id,
          streaming_profile_id: weekScheduleType === 'ghj' ? null : draft.streaming_profile_id,
        },
      });
    } catch {
      // Toast is handled in hook.
    }
  };

  const handleExportPdf = () => {
    if (persistedWeeks.length === 0) {
      toast({
        title: 'Nada para exportar',
        description: 'Gere ou salve a escala tecnica antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportTechnicalAndGeneralSchedulesPdf({
        technicalWeeks: persistedWeeks,
        generalSchedules: generalSchedulesForExport,
        startDate,
        generalWeeks: generalWeeksForExport,
      });

      toast({
        title: 'PDF exportado',
        description: `Escala tecnica e tabela geral de ${generalWeeksForExport} semanas exportadas.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao exportar PDF.';
      toast({
        title: 'Erro ao exportar PDF',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const renderTechnicianSelect = (
    week: TechnicalScheduleWeek,
    role: 'lead' | 'sound' | 'streaming',
    options: typeof technicians,
    disabled: boolean,
  ) => {
    const draft = resolveDraft(week);
    const value = draft[`${role}_profile_id`] ?? 'none';

    return (
      <Select
        value={value}
        onValueChange={(nextValue) => {
          updateDraft(week, {
            [`${role}_profile_id`]: nextValue === 'none' ? null : nextValue,
          } as Partial<WeekDraft>);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="min-w-[150px] rounded-xl border-border bg-card sm:min-w-[190px]">
          <SelectValue placeholder="Selecione um técnico" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Não definido</SelectItem>
          {options.map((technician) => (
            <SelectItem key={technician.id} value={technician.id}>
              {technician.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
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
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="admin-page-title flex items-center gap-2">
            <Wrench className="h-7 w-7 text-primary" />
            Escala Técnica de Som
          </h1>

          <Button variant="outline" className="rounded-xl border-border bg-card" onClick={handleExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </header>

      <Card className="admin-surface">
        <CardHeader>
          <CardTitle className="text-xl">Gerar Escala</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="tech-start-date">Início</Label>
            <Input
              id="tech-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              min={minStartDate}
              className="rounded-xl border-border bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tech-weeks">Semanas</Label>
            <Input
              id="tech-weeks"
              type="number"
              min={1}
              max={24}
              value={weeks}
              onChange={(event) => setWeeks(Math.max(1, Math.min(24, Number(event.target.value) || 1)))}
              className="rounded-xl border-border bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tech-schedule-type">Tipo de Escala</Label>
            <Select
              value={scheduleType}
              onValueChange={(value) => setScheduleType(value as TechnicalScheduleType)}
            >
              <SelectTrigger id="tech-schedule-type" className="rounded-xl border-border bg-card">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public_worship">Culto Público</SelectItem>
                <SelectItem value="ghj">GHJ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-end">
            <Button
              className="w-full"
              disabled={generateMutation.isPending}
              onClick={() => void handleGenerate()}
            >
              {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Gerar e salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="admin-surface">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-xl">Semanas Salvas</CardTitle>
          {persistedWeeks.some((week) => week.id) && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsDeleteAllOpen(true)}
              disabled={deleteWeeksMutation.isPending}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Apagar todas
            </Button>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {persistedWeeks.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma semana técnica cadastrada neste período.</p>
          )}

          {persistedWeeks.length > 0 && (
            <Table className="min-w-[680px] overflow-hidden rounded-xl border border-border">
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted [&>th]:text-foreground">
                  <TableHead>Semana</TableHead>
                  <TableHead>Técnico Lead</TableHead>
                  <TableHead>Técnico Assistente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {persistedWeeks.map((week) => {
                  const disabled = updateWeekMutation.isPending || deleteWeekMutation.isPending || deleteWeeksMutation.isPending;
                  const weekScheduleType = (week.schedule_type ?? scheduleType) as TechnicalScheduleType;
                  const leadOptions = filterTechniciansByScheduleType(techniciansByRole.lead, weekScheduleType);
                  const soundOptions = filterTechniciansByScheduleType(techniciansByRole.sound, weekScheduleType);

                  return (
                    <TableRow key={week.id ?? week.week_start_date} className="hover:bg-muted data-[state=selected]:bg-muted">
                      <TableCell className="font-medium capitalize">{formatWeekDate(week.week_start_date)}</TableCell>
                      <TableCell>{renderTechnicianSelect(week, 'lead', leadOptions, disabled)}</TableCell>
                      <TableCell>{renderTechnicianSelect(week, 'sound', soundOptions, disabled)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => void handleSaveWeek(week)}
                            disabled={disabled || !week.id}
                          >
                            {updateWeekMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setWeekToDelete(week)}
                            disabled={disabled || !week.id}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Apagar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todas as semanas?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove as <strong>{persistedWeeks.filter((week) => week.id).length}</strong> semana(s) técnica(s)
              listadas neste período. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDeleteAll();
              }}
              disabled={deleteWeeksMutation.isPending}
            >
              {deleteWeeksMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apagar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={weekToDelete !== null} onOpenChange={(open) => !open && setWeekToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar semana técnica?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove a escala da semana{' '}
              <strong>{weekToDelete ? formatWeekDate(weekToDelete.week_start_date) : ''}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmDeleteWeek()}
              disabled={deleteWeekMutation.isPending}
            >
              {deleteWeekMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
