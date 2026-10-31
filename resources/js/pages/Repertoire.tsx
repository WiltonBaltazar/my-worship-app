import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddSongDialog } from '@/components/admin/AddSongDialog';
import { EditSongDialog } from '@/components/admin/EditSongDialog';
import { SongCatalog } from '@/components/songs/SongCatalog';
import { useSongCatalog } from '@/hooks/useSongCatalog';
import { type Song, useSongs } from '@/hooks/useSongs';

export default function Repertoire() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const navigate = useNavigate();
  const { data: songs, isLoading } = useSongs();
  const catalog = useSongCatalog(songs, 'wora:repertoire');

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page-container pb-20">
      <Header title="Repertório" showNotifications />

      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar música
          </Button>
        </div>

        <SongCatalog
          catalog={catalog}
          narrow
          onEdit={setEditingSong}
          onOpen={(song) => navigate(`/songs/${song.id}`)}
        />
      </div>

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

      <BottomNav />
    </div>
  );
}
