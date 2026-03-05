import { useState } from 'react';
import { Edit2, Filter, Loader2, Mic2, Music, Plus, Search, Trash2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { AddMemberDialog } from '@/components/admin/AddMemberDialog';
import { EditMemberDialog } from '@/components/admin/EditMemberDialog';
import { type Profile, useDeleteProfile, useProfiles } from '@/hooks/useProfiles';

const instrumentLabels: Record<string, string> = {
  guitar: 'Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  acoustic_guitar: 'Violão',
  violin: 'Violino',
  percussion: 'Percussão',
  other: 'Outro',
};

const voiceLabels: Record<string, string> = {
  lead: 'Voz Principal (Dirigente)',
  soprano: 'Primeira Voz (Soprano)',
  alto: 'Segunda Voz (Alto/Contralto)',
  tenor: 'Terceira Voz (Tenor)',
  bass_voice: 'Voz Grave (Baixo)',
};

const homeGroupLabels: Record<string, string> = {
  GHH: 'Grupo Homegénio de Homens',
  GHS: 'Grupo Homegénio de Senhoras',
  GHJ: 'Grupo Homegénio de Jovens',
  GHC: 'Grupo Homegénio de Crianças',
};

export default function AdminMembers() {
  const { data: members, isLoading } = useProfiles();
  const deleteProfileMutation = useDeleteProfile();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [deletingMember, setDeletingMember] = useState<Profile | null>(null);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedVoices, setSelectedVoices] = useState<string[]>([]);

  const toggleInstrument = (instrument: string) => {
    setSelectedInstruments((previous) =>
      previous.includes(instrument) ? previous.filter((item) => item !== instrument) : [...previous, instrument],
    );
  };

  const toggleVoice = (voice: string) => {
    setSelectedVoices((previous) => (previous.includes(voice) ? previous.filter((item) => item !== voice) : [...previous, voice]));
  };

  const clearFilters = () => {
    setSelectedInstruments([]);
    setSelectedVoices([]);
  };

  const hasActiveFilters = selectedInstruments.length > 0 || selectedVoices.length > 0;

  const filteredMembers =
    members?.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesInstruments =
        selectedInstruments.length === 0 ||
        (member.instruments ?? []).some((instrument) => selectedInstruments.includes(instrument));

      const matchesVoices =
        selectedVoices.length === 0 || (member.voices ?? []).some((voice) => selectedVoices.includes(voice));

      return matchesSearch && matchesInstruments && matchesVoices;
    }) ?? [];

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
          <h1 className="text-3xl font-bold text-foreground">Membros</h1>
          <p className="text-muted-foreground">Gerencie os membros do ministério</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Membro
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar membros..."
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
              {hasActiveFilters && (
                <Badge className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center p-0 text-xs">
                  {selectedInstruments.length + selectedVoices.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Instrumentos</DropdownMenuLabel>
            {Object.entries(instrumentLabels).map(([value, label]) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={selectedInstruments.includes(value)}
                onCheckedChange={() => toggleInstrument(value)}
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Vozes</DropdownMenuLabel>
            {Object.entries(voiceLabels).map(([value, label]) => (
              <DropdownMenuCheckboxItem key={value} checked={selectedVoices.includes(value)} onCheckedChange={() => toggleVoice(value)}>
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {selectedInstruments.map((instrument) => (
            <Badge key={instrument} variant="secondary" className="gap-1">
              {instrumentLabels[instrument]}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => toggleInstrument(instrument)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {selectedVoices.map((voice) => (
            <Badge key={voice} variant="secondary" className="gap-1">
              {voiceLabels[voice]}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => toggleVoice(voice)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {filteredMembers.map((member) => {
          const initials = member.name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <Card key={member.id} className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={member.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{member.name}</h3>
                      {member.home_group && (
                        <Badge className="bg-accent text-accent-foreground text-xs">
                          {homeGroupLabels[member.home_group] ?? member.home_group}
                        </Badge>
                      )}
                      {member.can_lead && <Badge className="bg-primary/10 text-primary text-xs">Pode liderar</Badge>}
                      {member.can_be_tech_lead && <Badge className="bg-secondary text-secondary-foreground text-xs">Tech Lead</Badge>}
                      {member.can_be_tech_sound && <Badge className="bg-secondary text-secondary-foreground text-xs">Tech Som</Badge>}
                      {member.can_be_tech_streaming && <Badge className="bg-secondary text-secondary-foreground text-xs">Tech Streaming</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>

                    <div className="mt-3 flex flex-wrap gap-4">
                      {(member.instruments ?? []).length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Music className="h-4 w-4 text-muted-foreground" />
                          {(member.instruments ?? []).map((instrument) => (
                            <Badge key={instrument} variant="secondary" className="text-xs">
                              {instrumentLabels[instrument] || instrument}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {(member.voices ?? []).length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Mic2 className="h-4 w-4 text-muted-foreground" />
                          {(member.voices ?? []).map((voice) => (
                            <Badge key={voice} variant="secondary" className="text-xs">
                              {voiceLabels[voice] || voice}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingMember(member)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingMember(member)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredMembers.length === 0 && <p className="py-12 text-center text-muted-foreground">Nenhum membro encontrado</p>}

      <AddMemberDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {editingMember && (
        <EditMemberDialog
          member={editingMember}
          open={editingMember !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingMember(null);
            }
          }}
        />
      )}

      <AlertDialog open={deletingMember !== null} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deletingMember?.name}</strong>? O membro será desativado e não
              aparecerá mais nas listas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingMember) {
                  return;
                }

                deleteProfileMutation.mutate(deletingMember.id);
                setDeletingMember(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
