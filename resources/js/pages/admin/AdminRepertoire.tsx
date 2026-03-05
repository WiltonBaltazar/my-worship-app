import { useState } from 'react';
import { Edit2, ExternalLink, Loader2, Music2, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AddSongDialog } from '@/components/admin/AddSongDialog';
import { EditSongDialog } from '@/components/admin/EditSongDialog';
import { type Song, useDeleteSong, useSongs } from '@/hooks/useSongs';

export default function AdminRepertoire() {
  const { data: songs, isLoading } = useSongs();
  const deleteSongMutation = useDeleteSong();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const filteredSongs =
    songs?.filter((song) => {
      const normalizedQuery = searchQuery.toLowerCase();
      return (
        song.title.toLowerCase().includes(normalizedQuery) ||
        (song.artist ?? '').toLowerCase().includes(normalizedQuery) ||
        (song.tags ?? []).some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
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
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Repertório</h1>
          <p className="text-muted-foreground">Gerencie as músicas do ministério</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Música
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar músicas por título, artista ou tag..."
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredSongs.map((song) => (
          <Card key={song.id} className="border-none shadow-soft">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Music2 className="h-6 w-6 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{song.title}</h3>
                    </div>

                    {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}

                    {(song.tags ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(song.tags ?? []).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {song.chords_url && (
                        <a
                          href={song.chords_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Cifra
                        </a>
                      )}
                      {song.lyrics_url && (
                        <a
                          href={song.lyrics_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Letra
                        </a>
                      )}
                      {song.video_url && (
                        <a
                          href={song.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Vídeo
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 self-end sm:self-start">
                  <Button variant="ghost" size="icon" onClick={() => setEditingSong(song)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteSongMutation.mutate(song.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSongs.length === 0 && <p className="py-12 text-center text-muted-foreground">Nenhuma música encontrada</p>}

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
    </div>
  );
}
