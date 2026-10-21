import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MinistryBadge } from '@/components/schedule/MinistryBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenAvailabilityCall } from '@/hooks/useAvailabilityCalls';
import { useCreateSchedule } from '@/hooks/useSchedules';
import { HALF_HOUR_TIME_OPTIONS, toLocalDateInputValue } from '@/lib/date-time';
import { MINISTRY_LABELS, type Ministry } from '@/lib/ministry';

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateScheduleDialog({ open, onOpenChange }: CreateScheduleDialogProps) {
  const createScheduleMutation = useCreateSchedule();
  const openCallMutation = useOpenAvailabilityCall();
  const { ledMinistries } = useAuth();
  const defaultMinistry: Ministry = ledMinistries[0] ?? 'dms';

  const minScheduleDate = toLocalDateInputValue();

  const [title, setTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [ministry, setMinistry] = useState<Ministry>(defaultMinistry);
  const [openCall, setOpenCall] = useState(false);
  const [callDeadline, setCallDeadline] = useState('');

  const canChooseMinistry = ledMinistries.length > 1;
  const effectiveMinistry = canChooseMinistry ? ministry : defaultMinistry;

  const resetForm = () => {
    setTitle('');
    setScheduleDate('');
    setStartTime('11:00');
    setNotes('');
    setMinistry(defaultMinistry);
    setOpenCall(false);
    setCallDeadline('');
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!scheduleDate) {
      return;
    }

    try {
      const created = await createScheduleMutation.mutateAsync({
        title: title.trim() || undefined,
        schedule_date: scheduleDate,
        start_time: startTime,
        notes: notes || undefined,
        schedule_type: 'worship',
        ministry: effectiveMinistry,
        status: 'draft',
      });

      if (openCall) {
        // The schedule exists even if this fails; the leader can retry from the details page.
        await openCallMutation
          .mutateAsync({
            scheduleId: created.id,
            deadline: callDeadline ? new Date(callDeadline).toISOString() : null,
          })
          .catch(() => undefined);
      }

      handleClose(false);
    } catch {
      // Toast is handled by hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl lg:text-2xl">
            <Calendar className="h-5 w-5 text-primary" />
            Nova Escala
            {!canChooseMinistry && <MinistryBadge ministry={effectiveMinistry} />}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {canChooseMinistry && (
            <div className="space-y-2">
              <Label>Ministério</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={ministry}
                onValueChange={(value) => value && setMinistry(value as Ministry)}
                className="justify-start"
              >
                {ledMinistries.map((option) => (
                  <ToggleGroupItem key={option} value={option} className="px-4">
                    {MINISTRY_LABELS[option]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="create-schedule-title">Título</Label>
            <Input
              id="create-schedule-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Culto de Domingo"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-schedule-date">Data *</Label>
            <Input
              id="create-schedule-date"
              type="date"
              value={scheduleDate}
              onChange={(event) => setScheduleDate(event.target.value)}
              min={minScheduleDate}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-schedule-time">Horário</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger id="create-schedule-time">
                <SelectValue placeholder="Selecione o horário" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {HALF_HOUR_TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-schedule-notes">Observações</Label>
            <Textarea
              id="create-schedule-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observações sobre esta escala..."
              rows={3}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="create-schedule-open-call"
                checked={openCall}
                onCheckedChange={(checked) => setOpenCall(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="create-schedule-open-call">Perguntar quem pode participar</Label>
                <p className="text-xs text-muted-foreground">
                  Os membros do {MINISTRY_LABELS[effectiveMinistry]} recebem uma notificação e confirmam a disponibilidade.
                  Você define a função de cada um depois.
                </p>
              </div>
            </div>
            {openCall && (
              <div className="space-y-1">
                <Label htmlFor="create-schedule-call-deadline" className="text-xs text-muted-foreground">
                  Prazo para responder (opcional)
                </Label>
                <Input
                  id="create-schedule-call-deadline"
                  type="datetime-local"
                  value={callDeadline}
                  onChange={(event) => setCallDeadline(event.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createScheduleMutation.isPending || openCallMutation.isPending}>
              {createScheduleMutation.isPending || openCallMutation.isPending ? 'Criando...' : 'Criar Escala'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
