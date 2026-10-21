import { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Pencil, Plus, Search, Sparkles, Star, Trash2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type Profile, useProfiles } from '@/hooks/useProfiles';
import { useDeleteScheduleGuest, useSaveScheduleGuest } from '@/hooks/useScheduleGuests';
import type { ScheduleGuest } from '@/hooks/useSchedules';
import type { Ministry } from '@/lib/ministry';
import { cn } from '@/lib/utils';

const ROLE_SUGGESTIONS = ['Cantar', 'Pregar', 'Ministrar', 'Testemunho', 'Tocar', 'Poema', 'Teatro', 'Dança'];

type PresenterKind = 'member' | 'guest';

interface GuestFormState {
  kind: PresenterKind;
  profile_id: string;
  name: string;
  role: string;
  song_title: string;
  song_url: string;
  notes: string;
}

const emptyForm: GuestFormState = { kind: 'guest', profile_id: '', name: '', role: '', song_title: '', song_url: '', notes: '' };

function toForm(guest: ScheduleGuest | null): GuestFormState {
  if (!guest) {
    return emptyForm;
  }

  return {
    kind: guest.profile_id ? 'member' : 'guest',
    profile_id: guest.profile_id ?? '',
    name: guest.profile_id ? '' : guest.name,
    role: guest.role,
    song_title: guest.song_title ?? '',
    song_url: guest.song_url ?? '',
    notes: guest.notes ?? '',
  };
}

/** Accepts links pasted without a scheme ("youtu.be/…") by assuming https. */
function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Case- and accent-insensitive, so "joao" finds "João". */
function normalizeForSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function MemberPicker({
  members,
  isLoading,
  value,
  onChange,
}: {
  members: Profile[];
  isLoading: boolean;
  value: string;
  onChange: (profileId: string) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    return needle ? sorted.filter((member) => normalizeForSearch(member.name).includes(needle)) : sorted;
  }, [members, query]);

  const selected = members.find((member) => member.id === value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selected ? `Selecionado: ${selected.name}` : 'Pesquisar membro...'}
          className="pl-9"
          aria-label="Pesquisar membro"
        />
      </div>

      <div className="max-h-52 overflow-y-auto rounded-xl border border-border" role="listbox" aria-label="Membros">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</p>
        ) : (
          filtered.map((member) => {
            const isSelected = member.id === value;

            return (
              <button
                key={member.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onChange(member.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60',
                  isSelected && 'bg-primary/10 font-medium',
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="h-7 w-7 object-cover" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{member.name}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function GuestDialog({
  scheduleId,
  ministry,
  guest,
  open,
  onOpenChange,
}: {
  scheduleId: string;
  ministry: Ministry;
  guest: ScheduleGuest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const saveMutation = useSaveScheduleGuest();
  const [form, setForm] = useState<GuestFormState>(() => toForm(guest));
  // Only members of this schedule's ministry can present on it.
  const { data: members = [], isLoading: membersLoading } = useProfiles({ ministry, enabled: form.kind === 'member' });

  const update = (field: keyof GuestFormState) => (value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await saveMutation.mutateAsync({
        scheduleId,
        guestId: guest?.id,
        profile_id: form.kind === 'member' ? form.profile_id : null,
        name: form.kind === 'guest' ? form.name.trim() : null,
        role: form.role.trim(),
        song_title: form.song_title.trim() || null,
        song_url: normalizeUrl(form.song_url),
        notes: form.notes.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // Toast is handled by hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            {guest ? 'Editar participação' : 'Nova participação especial'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Quem vai apresentar *</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={form.kind}
              onValueChange={(value) => value && update('kind')(value)}
              className="justify-start"
            >
              <ToggleGroupItem value="member" className="px-4">Membro</ToggleGroupItem>
              <ToggleGroupItem value="guest" className="px-4">Convidado externo</ToggleGroupItem>
            </ToggleGroup>

            {form.kind === 'member' ? (
              <MemberPicker
                members={members}
                isLoading={membersLoading}
                value={form.profile_id}
                onChange={update('profile_id')}
              />
            ) : (
              <Input
                id="guest-name"
                aria-label="Nome do convidado"
                value={form.name}
                onChange={(event) => update('name')(event.target.value)}
                placeholder="Ex: Maria Cossa"
                maxLength={255}
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-role">O que vai fazer *</Label>
            <Input
              id="guest-role"
              value={form.role}
              onChange={(event) => update('role')(event.target.value)}
              placeholder="Ex: Cantar, recitar um poema..."
              maxLength={100}
              required
            />
            <div className="flex flex-wrap gap-1.5">
              {ROLE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => update('role')(suggestion)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                    form.role === suggestion
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/50',
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guest-song">Título da apresentação</Label>
              <Input
                id="guest-song"
                value={form.song_title}
                onChange={(event) => update('song_title')(event.target.value)}
                placeholder="Ex: nome da música ou do poema"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-song-url">Link</Label>
              <Input
                id="guest-song-url"
                type="text"
                inputMode="url"
                value={form.song_url}
                onChange={(event) => update('song_url')(event.target.value)}
                placeholder="Vídeo, áudio, letra..."
                maxLength={2048}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-notes">Observações</Label>
            <Textarea
              id="guest-notes"
              value={form.notes}
              onChange={(event) => update('notes')(event.target.value)}
              placeholder="Tom, horário de chegada, contacto..."
              rows={3}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || (form.kind === 'member' && !form.profile_id)}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {guest ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GuestCard({
  guest,
  canManage,
  onEdit,
}: {
  guest: ScheduleGuest;
  canManage: boolean;
  onEdit: (guest: ScheduleGuest) => void;
}) {
  const deleteMutation = useDeleteScheduleGuest();

  return (
    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            {guest.avatar_url ? (
              <img src={guest.avatar_url} alt={guest.name} className="h-10 w-10 rounded-full object-cover" />
            ) : guest.profile_id ? (
              <User className="h-5 w-5" />
            ) : (
              <Star className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{guest.name}</p>
              <Badge variant="outline" className="border-amber-400/60 text-amber-800 dark:text-amber-300">
                {guest.role}
              </Badge>
              {!guest.profile_id && (
                <span className="text-xs text-muted-foreground">Convidado</span>
              )}
            </div>
            {(guest.song_title || guest.song_url) && (
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                {guest.song_url ? (
                  <a
                    href={guest.song_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-0 items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span className="truncate">{guest.song_title || 'Abrir link'}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="truncate">{guest.song_title}</span>
                )}
              </div>
            )}
            {guest.notes && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{guest.notes}</p>}
          </div>
        </div>

        {canManage && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(guest)} aria-label="Editar participação">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(guest.id)}
              disabled={deleteMutation.isPending}
              aria-label="Remover participação"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScheduleGuests({
  scheduleId,
  ministry,
  guests,
  canManage,
  titleClassName,
}: {
  scheduleId: string;
  ministry: Ministry;
  guests: ScheduleGuest[];
  canManage: boolean;
  titleClassName?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<ScheduleGuest | null>(null);

  if (!canManage && guests.length === 0) {
    return null;
  }

  const openDialog = (guest: ScheduleGuest | null) => {
    setEditingGuest(guest);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <h2 className={cn('text-xl font-semibold', titleClassName)}>Participações especiais ({guests.length})</h2>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => openDialog(null)}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {guests.map((guest) => (
          <GuestCard key={guest.id} guest={guest} canManage={canManage} onEdit={openDialog} />
        ))}
        {guests.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            Nenhuma participação especial. Adicione membros ou convidados externos que vão cantar, pregar, declamar...
          </p>
        )}
      </div>

      {/* Keyed so the form resets to the guest being edited each time it opens. */}
      {dialogOpen && (
        <GuestDialog
          key={editingGuest?.id ?? 'new'}
          scheduleId={scheduleId}
          ministry={ministry}
          guest={editingGuest}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
