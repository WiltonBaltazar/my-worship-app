import { useEffect, useState } from 'react';
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
import { type Profile, useUpdateProfile } from '@/hooks/useProfiles';

const instruments = [
  { value: 'guitar', label: 'Guitarra' },
  { value: 'bass', label: 'Baixo' },
  { value: 'drums', label: 'Bateria' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'acoustic_guitar', label: 'Violão' },
  { value: 'violin', label: 'Violino' },
  { value: 'percussion', label: 'Percussão' },
  { value: 'sound_tech', label: 'Técnico de Som' },
  { value: 'other', label: 'Outro' },
];

const voiceTypes = [
  { value: 'lead', label: 'Voz Principal (Dirigente)' },
  { value: 'soprano', label: 'Primeira Voz (Soprano)' },
  { value: 'alto', label: 'Segunda Voz (Alto/Contralto)' },
  { value: 'tenor', label: 'Terceira Voz (Tenor)' },
  { value: 'bass_voice', label: 'Voz Grave (Baixo)' },
];

interface EditMemberDialogProps {
  member: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMemberDialog({ member, open, onOpenChange }: EditMemberDialogProps) {
  const updateProfileMutation = useUpdateProfile();

  const [name, setName] = useState(member.name);
  const [canLead, setCanLead] = useState(member.can_lead);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(member.instruments ?? []);
  const [selectedVoices, setSelectedVoices] = useState<string[]>(member.voices ?? []);

  useEffect(() => {
    setName(member.name);
    setCanLead(member.can_lead);
    setSelectedInstruments(member.instruments ?? []);
    setSelectedVoices(member.voices ?? []);
  }, [member]);

  const toggleInstrument = (value: string) => {
    setSelectedInstruments((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
    );
  };

  const toggleVoice = (value: string) => {
    setSelectedVoices((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await updateProfileMutation.mutateAsync({
        profileId: member.id,
        updates: {
          name,
          can_lead: canLead,
        },
        instruments: selectedInstruments,
        voices: selectedVoices,
      });

      onOpenChange(false);
    } catch {
      // Toast is handled by hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-member-name">Nome completo</Label>
            <Input
              id="edit-member-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={member.email} disabled className="bg-muted" />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-member-can-lead"
              checked={canLead}
              onCheckedChange={(checked) => setCanLead(checked === true)}
            />
            <Label htmlFor="edit-member-can-lead" className="cursor-pointer">
              Pode liderar o louvor
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Instrumentos</Label>
            <div className="grid grid-cols-2 gap-2">
              {instruments.map((instrument) => (
                <div key={instrument.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-member-instrument-${instrument.value}`}
                    checked={selectedInstruments.includes(instrument.value)}
                    onCheckedChange={() => toggleInstrument(instrument.value)}
                  />
                  <Label htmlFor={`edit-member-instrument-${instrument.value}`} className="cursor-pointer text-sm">
                    {instrument.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vocais</Label>
            <div className="grid grid-cols-2 gap-2">
              {voiceTypes.map((voice) => (
                <div key={voice.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-member-voice-${voice.value}`}
                    checked={selectedVoices.includes(voice.value)}
                    onCheckedChange={() => toggleVoice(voice.value)}
                  />
                  <Label htmlFor={`edit-member-voice-${voice.value}`} className="cursor-pointer text-sm">
                    {voice.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
