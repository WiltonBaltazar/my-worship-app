import { useMemo, useState } from 'react';
import { Check, Loader2, RefreshCw, Search, Shield, ShieldCheck, Trash2, User, UserPlus, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { type Profile, useProfilesByFilters, useUpdateProfile } from '@/hooks/useProfiles';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  leader: 'Líder',
  member: 'Membro',
  sound_tech: 'Técnico de Som',
};

const roleIcons: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="h-4 w-4" />,
  leader: <Shield className="h-4 w-4" />,
  member: <User className="h-4 w-4" />,
  sound_tech: <Shield className="h-4 w-4" />,
};

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const { data: users, isLoading } = useProfilesByFilters({
    status: isAdmin ? 'all' : 'pending',
    activity: isAdmin ? 'all' : 'active',
  });

  const updateProfileMutation = useUpdateProfile();

  const [searchQuery, setSearchQuery] = useState('');
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);

  const pendingUsers = useMemo(() => (users ?? []).filter((user) => !user.is_approved && user.is_active), [users]);
  const approvedUsers = useMemo(() => (users ?? []).filter((user) => user.is_approved && user.is_active), [users]);
  const deactivatedUsers = useMemo(() => (users ?? []).filter((user) => !user.is_active), [users]);

  const normalizedSearch = searchQuery.toLowerCase();

  const filteredApproved = approvedUsers.filter(
    (user) => user.name.toLowerCase().includes(normalizedSearch) || user.email.toLowerCase().includes(normalizedSearch),
  );

  const filteredDeactivated = deactivatedUsers.filter(
    (user) => user.name.toLowerCase().includes(normalizedSearch) || user.email.toLowerCase().includes(normalizedSearch),
  );

  const updateUser = async (profileId: string, updates: Partial<Profile>) => {
    try {
      await updateProfileMutation.mutateAsync({
        profileId,
        updates,
      });
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

  const UserCard = ({ user, showApprovalActions = false }: { user: Profile; showApprovalActions?: boolean }) => {
    const initials = user.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const role = user.role ?? 'member';

    return (
      <Card className="border-none shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground">{user.name}</h3>
                {!showApprovalActions && (
                  <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="gap-1">
                    {roleIcons[role]}
                    {roleLabels[role]}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {showApprovalActions ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updateUser(user.id, { is_approved: true, is_active: true })}
                  disabled={updateProfileMutation.isPending}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateUser(user.id, { is_active: false })}
                  disabled={updateProfileMutation.isPending}
                >
                  <X className="mr-1 h-4 w-4" />
                  Rejeitar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select
                  value={role}
                  onValueChange={(value) => updateUser(user.id, { role: value as 'admin' | 'leader' | 'member' | 'sound_tech' })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="sound_tech">Técnico de Som</SelectItem>
                    <SelectItem value="leader">Líder</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeletingUser(user)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">Aprove solicitações e gerencie funções dos usuários</p>
      </header>

      {isAdmin ? (
        <Tabs defaultValue={pendingUsers.length > 0 ? 'pending' : 'approved'}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pendentes
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="flex h-5 w-5 items-center justify-center p-0">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="deactivated" className="gap-2">
              Desativados
              {deactivatedUsers.length > 0 && (
                <Badge variant="secondary" className="flex h-5 w-5 items-center justify-center p-0">
                  {deactivatedUsers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-4">
            {pendingUsers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">Nenhuma solicitação pendente</CardContent>
              </Card>
            ) : (
              pendingUsers.map((user) => <UserCard key={user.id} user={user} showApprovalActions />)
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar usuários..."
                className="pl-10"
              />
            </div>

            {filteredApproved.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado</CardContent>
              </Card>
            ) : (
              filteredApproved.map((user) => <UserCard key={user.id} user={user} />)
            )}
          </TabsContent>

          <TabsContent value="deactivated" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar usuários desativados..."
                className="pl-10"
              />
            </div>

            {filteredDeactivated.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <RefreshCw className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum usuário desativado</p>
                </CardContent>
              </Card>
            ) : (
              filteredDeactivated.map((user) => {
                const initials = user.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <Card key={user.id} className="border-none shadow-soft">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <Avatar className="h-12 w-12 border-2 border-muted">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground font-semibold">{initials}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{user.name}</h3>
                            <Badge variant="outline" className="text-muted-foreground">
                              Desativado
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <Button onClick={() => updateUser(user.id, { is_active: true, is_approved: true })} disabled={updateProfileMutation.isPending}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Reativar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Nenhuma solicitação pendente</CardContent>
            </Card>
          ) : (
            pendingUsers.map((user) => <UserCard key={user.id} user={user} showApprovalActions />)
          )}
        </div>
      )}

      <AlertDialog open={deletingUser !== null} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deletingUser?.name}</strong>? O usuário será desativado e perderá
              acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingUser) {
                  return;
                }

                updateUser(deletingUser.id, { is_active: false });
                setDeletingUser(null);
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
