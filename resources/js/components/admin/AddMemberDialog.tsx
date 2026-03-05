import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import type { Profile } from '@/hooks/useProfiles';

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

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RegisterResponse {
  requires_approval?: boolean;
  profile_id?: string;
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [homeGroup, setHomeGroup] = useState<Profile['home_group']>(null);
  const [canLead, setCanLead] = useState(false);
  const [canBeTechLead, setCanBeTechLead] = useState(false);
  const [canBeTechSound, setCanBeTechSound] = useState(false);
  const [canBeTechStreaming, setCanBeTechStreaming] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedVoices, setSelectedVoices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setHomeGroup(null);
    setCanLead(false);
    setCanBeTechLead(false);
    setCanBeTechSound(false);
    setCanBeTechStreaming(false);
    setSelectedInstruments([]);
    setSelectedVoices([]);
  };

  const resolveProfileId = async (response: RegisterResponse, normalizedEmail: string): Promise<string> => {
    if (response.profile_id) {
      return response.profile_id;
    }

    const pendingProfiles = await apiRequest<Profile[]>('/api/profiles?status=pending&activity=active');
    const matchingProfile = pendingProfiles.find(
      (profile) => profile.email.toLowerCase() === normalizedEmail.toLowerCase(),
    );

    if (!matchingProfile) {
      throw new Error('Conta criada, mas não foi possível localizar o perfil para aprovação.');
    }

    return matchingProfile.id;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const registerResponse = await apiRequest<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: {
          name: name.trim(),
          email: normalizedEmail,
          password,
        },
      });

      const profileId = await resolveProfileId(registerResponse, normalizedEmail);

      await apiRequest<Profile>(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        body: {
          can_lead: canLead,
          home_group: homeGroup,
          can_be_tech_lead: canBeTechLead,
          can_be_tech_sound: canBeTechSound,
          can_be_tech_streaming: canBeTechStreaming,
          is_approved: true,
          is_active: true,
          instruments: selectedInstruments,
          voices: selectedVoices,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'Membro adicionado com sucesso!' });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar membro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Membro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-member-name">Nome completo</Label>
            <Input
              id="add-member-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-member-email">E-mail</Label>
            <Input
              id="add-member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-member-password">Senha inicial</Label>
            <Input
              id="add-member-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-member-home-group">Grupo Homegénio</Label>
            <Select
              value={homeGroup ?? 'none'}
              onValueChange={(value) => setHomeGroup(value === 'none' ? null : value as Profile['home_group'])}
            >
              <SelectTrigger id="add-member-home-group">
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
              id="add-member-can-lead"
              checked={canLead}
              onCheckedChange={(checked) => setCanLead(checked === true)}
            />
            <Label htmlFor="add-member-can-lead" className="cursor-pointer">
              Pode liderar o louvor
            </Label>
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <Label className="text-sm font-medium">Escala técnica de som</Label>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="add-member-tech-lead"
                  checked={canBeTechLead}
                  onCheckedChange={(checked) => setCanBeTechLead(checked === true)}
                />
                <Label htmlFor="add-member-tech-lead" className="cursor-pointer text-sm">
                  Pode atuar como Lead técnico
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="add-member-tech-sound"
                  checked={canBeTechSound}
                  onCheckedChange={(checked) => setCanBeTechSound(checked === true)}
                />
                <Label htmlFor="add-member-tech-sound" className="cursor-pointer text-sm">
                  Pode atuar no Som
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="add-member-tech-streaming"
                  checked={canBeTechStreaming}
                  onCheckedChange={(checked) => setCanBeTechStreaming(checked === true)}
                />
                <Label htmlFor="add-member-tech-streaming" className="cursor-pointer text-sm">
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
                    id={`add-member-instrument-${instrument.value}`}
                    checked={selectedInstruments.includes(instrument.value)}
                    onCheckedChange={() => toggleInstrument(instrument.value)}
                  />
                  <Label htmlFor={`add-member-instrument-${instrument.value}`} className="cursor-pointer text-sm">
                    {instrument.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vocais</Label>
            <div className="grid grid-cols-1 gap-2">
              {voiceTypes.map((voice) => (
                <div key={voice.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`add-member-voice-${voice.value}`}
                    checked={selectedVoices.includes(voice.value)}
                    onCheckedChange={() => toggleVoice(voice.value)}
                  />
                  <Label htmlFor={`add-member-voice-${voice.value}`} className="cursor-pointer text-sm">
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
