import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useCreateSchedule } from '@/hooks/useSchedules';
import { HALF_HOUR_TIME_OPTIONS, toLocalDateInputValue } from '@/lib/date-time';

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateScheduleDialog({ open, onOpenChange }: CreateScheduleDialogProps) {
  const createScheduleMutation = useCreateSchedule();

  const minScheduleDate = toLocalDateInputValue();

  const [title, setTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('11:00');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setTitle('');
    setScheduleDate('');
    setStartTime('11:00');
    setNotes('');
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
      await createScheduleMutation.mutateAsync({
        title: title.trim() || undefined,
        schedule_date: scheduleDate,
        start_time: startTime,
        notes: notes || undefined,
        schedule_type: 'worship',
        status: 'draft',
      });

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
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createScheduleMutation.isPending}>
              {createScheduleMutation.isPending ? 'Criando...' : 'Criar Escala'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
