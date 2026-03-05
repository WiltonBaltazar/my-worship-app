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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Profile, useUpdateProfile } from '@/hooks/useProfiles';

const instruments = [
  { value: 'guitar', label: 'Guitarra' },
  { value: 'bass', label: 'Baixo' },
  { value: 'drums', label: 'Bateria' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'acoustic_guitar', label: 'Violão' },
  { value: 'violin', label: 'Violino' },
  { value: 'percussion', label: 'Percussão' },
  { value: 'other', label: 'Outro' },
];

const voiceTypes = [
  { value: 'lead', label: 'Voz Principal (Dirigente)' },
  { value: 'soprano', label: 'Primeira Voz (Soprano)' },
  { value: 'alto', label: 'Segunda Voz (Alto/Contralto)' },
  { value: 'tenor', label: 'Terceira Voz (Tenor)' },
  { value: 'bass_voice', label: 'Voz Grave (Baixo)' },
];

const homeGroups = [
  { value: 'GHH', label: 'Grupo Homegénio de Homens (GHH)' },
  { value: 'GHS', label: 'Grupo Homegénio de Senhoras (GHS)' },
  { value: 'GHJ', label: 'Grupo Homegénio de Jovens (GHJ)' },
  { value: 'GHC', label: 'Grupo Homegénio de Crianças (GHC)' },
] as const;

interface EditMemberDialogProps {
  member: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMemberDialog({ member, open, onOpenChange }: EditMemberDialogProps) {
  const updateProfileMutation = useUpdateProfile();

  const [name, setName] = useState(member.name);
  const [homeGroup, setHomeGroup] = useState<Profile['home_group']>(member.home_group);
  const [canLead, setCanLead] = useState(member.can_lead);
  const [canBeTechLead, setCanBeTechLead] = useState(member.can_be_tech_lead);
  const [canBeTechSound, setCanBeTechSound] = useState(member.can_be_tech_sound);
  const [canBeTechStreaming, setCanBeTechStreaming] = useState(member.can_be_tech_streaming);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(member.instruments ?? []);
  const [selectedVoices, setSelectedVoices] = useState<string[]>(member.voices ?? []);

  useEffect(() => {
    setName(member.name);
    setHomeGroup(member.home_group);
    setCanLead(member.can_lead);
    setCanBeTechLead(member.can_be_tech_lead);
    setCanBeTechSound(member.can_be_tech_sound);
    setCanBeTechStreaming(member.can_be_tech_streaming);
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
          home_group: homeGroup,
          can_lead: canLead,
          can_be_tech_lead: canBeTechLead,
          can_be_tech_sound: canBeTechSound,
          can_be_tech_streaming: canBeTechStreaming,
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

          <div className="space-y-2">
            <Label htmlFor="edit-member-home-group">Grupo Homegénio</Label>
            <Select
              value={homeGroup ?? 'none'}
              onValueChange={(value) => setHomeGroup(value === 'none' ? null : value as Profile['home_group'])}
            >
              <SelectTrigger id="edit-member-home-group">
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não atribuído</SelectItem>
                {homeGroups.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2 rounded-xl border border-border p-3">
            <Label className="text-sm font-medium">Escala técnica de som</Label>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-member-tech-lead"
                  checked={canBeTechLead}
                  onCheckedChange={(checked) => setCanBeTechLead(checked === true)}
                />
                <Label htmlFor="edit-member-tech-lead" className="cursor-pointer text-sm">
                  Pode atuar como Lead técnico
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-member-tech-sound"
                  checked={canBeTechSound}
                  onCheckedChange={(checked) => setCanBeTechSound(checked === true)}
                />
                <Label htmlFor="edit-member-tech-sound" className="cursor-pointer text-sm">
                  Pode atuar no Som
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-member-tech-streaming"
                  checked={canBeTechStreaming}
                  onCheckedChange={(checked) => setCanBeTechStreaming(checked === true)}
                />
                <Label htmlFor="edit-member-tech-streaming" className="cursor-pointer text-sm">
                  Pode atuar no Streaming
                </Label>
              </div>
            </div>
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
