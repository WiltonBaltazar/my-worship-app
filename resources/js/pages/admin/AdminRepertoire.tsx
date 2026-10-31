import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AddSongDialog } from '@/components/admin/AddSongDialog';
import { EditSongDialog } from '@/components/admin/EditSongDialog';
import { SongCatalog } from '@/components/songs/SongCatalog';
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
import { useSongCatalog } from '@/hooks/useSongCatalog';
import { type Song, useDeleteSong, useSongs } from '@/hooks/useSongs';

export default function AdminRepertoire() {
  const { data: songs, isLoading } = useSongs();
  const deleteSongMutation = useDeleteSong();
  const catalog = useSongCatalog(songs, 'wora:admin-repertoire');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);

  const handleDelete = async () => {
    if (!deletingSong) {
      return;
    }

    try {
      await deleteSongMutation.mutateAsync(deletingSong.id);
      setDeletingSong(null);
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Repertório"
        description="Gerencie as músicas do ministério"
        actions={
          <Button className="h-10 rounded-lg px-4 font-semibold" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar música
          </Button>
        }
      />

      <SongCatalog catalog={catalog} onEdit={setEditingSong} onDelete={setDeletingSong} />

      <AddSongDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {editingSong && (
        <EditSongDialog
          song={editingSong}
          open={editingSong !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingSong(null);
            }
          }}
        />
      )}

      <AlertDialog open={deletingSong !== null} onOpenChange={(open) => !open && setDeletingSong(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir música?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSong ? `"${deletingSong.title}" será removida do repertório. ` : ''}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSongMutation.isPending}
            >
              {deleteSongMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
