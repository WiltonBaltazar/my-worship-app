import { useState } from 'react';
import { Search, User, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useProfiles } from '@/hooks/useProfiles';
import type { Schedule, ScheduleMember } from '@/hooks/useSchedules';

interface RequestSubstituteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null;
  myMembership: ScheduleMember | null;
  onSubmit: (substituteProfileIds: string[]) => void;
  isLoading?: boolean;
}

export function RequestSubstituteDialog({
  open,
  onOpenChange,
  schedule,
  myMembership,
  onSubmit,
  isLoading
}: RequestSubstituteDialogProps) {
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<string[]>([]);
  
  const { data: profiles } = useProfiles();

  // Filter out members already scheduled for this date
  const availableProfiles = profiles?.filter(
    p => p.role !== 'admin' && !schedule?.members?.some(m => m.profile_id === p.id)
  );

  // Filter by search
  const filteredProfiles = availableProfiles?.filter(p =>
    p.name.toLowerCase().includes(substituteSearch.toLowerCase()) &&
    !selectedSubstitutes.includes(p.id)
  );

  const handleToggleSubstitute = (profileId: string) => {
    setSelectedSubstitutes(prev => 
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleRemoveSubstitute = (profileId: string) => {
    setSelectedSubstitutes(prev => prev.filter(id => id !== profileId));
  };

  const handleSubmit = (withoutSubstitutes = false) => {
    if (withoutSubstitutes || selectedSubstitutes.length > 0) {
      onSubmit(withoutSubstitutes ? [] : selectedSubstitutes);
      setSubstituteSearch('');
      setSelectedSubstitutes([]);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSubstituteSearch('');
    setSelectedSubstitutes([]);
  };

  const getProfileById = (id: string) => profiles?.find(p => p.id === id);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar troca</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecione quem pode te substituir (opcional)</Label>
            <p className="text-sm text-muted-foreground">
              Eles receberão uma notificação e poderão aceitar ou recusar.
            </p>
            
            {/* Selected substitutes */}
            {selectedSubstitutes.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border border-border rounded-lg">
                {selectedSubstitutes.map(id => {
                  const profile = getProfileById(id);
                  return (
                    <button
                      type="button"
                      key={id} 
                      onClick={() => handleRemoveSubstitute(id)}
                      className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-full border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                    >
                      {profile?.name}
                      <X className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar membro..."
                value={substituteSearch}
                onChange={(e) => setSubstituteSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Profile list */}
            {filteredProfiles && filteredProfiles.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                {filteredProfiles.slice(0, 10).map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleToggleSubstitute(profile.id)}
                    className={`w-full min-h-11 touch-manipulation flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary ${
                      selectedSubstitutes.includes(profile.id) ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <span className="text-sm font-medium flex-1">{profile.name}</span>
                    {selectedSubstitutes.includes(profile.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {substituteSearch && filteredProfiles?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhum membro encontrado
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant="secondary"
            onClick={() => handleSubmit(true)} 
            disabled={isLoading}
          >
            {isLoading ? 'Enviando...' : 'Liderança escolhe'}
          </Button>
          <Button 
            onClick={() => handleSubmit(false)} 
            disabled={isLoading || selectedSubstitutes.length === 0}
          >
            {isLoading ? 'Enviando...' : `Enviar (${selectedSubstitutes.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
