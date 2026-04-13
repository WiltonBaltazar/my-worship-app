import { useEffect, useState } from 'react';
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
import { type Song, useCreateSong } from '@/hooks/useSongs';

interface AddSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills the title field (e.g. from a search query) */
  initialTitle?: string;
  /** Called with the newly created song after saving — use to add it to a schedule */
  onSongCreated?: (song: Song) => void;
}

export function AddSongDialog({ open, onOpenChange, initialTitle, onSongCreated }: AddSongDialogProps) {
  const createSongMutation = useCreateSong();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [chordsUrl, setChordsUrl] = useState('');
  const [lyricsUrl, setLyricsUrl] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initialTitle ?? '');
    }
  }, [open, initialTitle]);

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setChordsUrl('');
    setLyricsUrl('');
    setLyrics('');
    setVideoUrl('');
    setSpotifyUrl('');
    setAppleMusicUrl('');
    setTags('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const newSong = await createSongMutation.mutateAsync({
        title,
        artist: artist || null,
        chords_url: chordsUrl || null,
        lyrics_url: lyricsUrl || null,
        lyrics: lyrics || null,
        video_url: videoUrl || null,
        spotify_url: spotifyUrl || null,
        apple_music_url: appleMusicUrl || null,
        tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
      });

      onOpenChange(false);
      resetForm();
      onSongCreated?.(newSong);
    } catch {
      // Toast is handled by hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Música</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-song-title">Título *</Label>
            <Input
              id="add-song-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-song-artist">Artista</Label>
            <Input
              id="add-song-artist"
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-song-lyrics">Letra</Label>
            <Textarea
              id="add-song-lyrics"
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              placeholder="Cole a letra da música aqui..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-song-chords">Link da Cifra</Label>
            <Input
              id="add-song-chords"
              type="url"
              value={chordsUrl}
              onChange={(event) => setChordsUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-song-lyrics-url">Link Externo da Letra</Label>
            <Input
              id="add-song-lyrics-url"
              type="url"
              value={lyricsUrl}
              onChange={(event) => setLyricsUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-song-video">Link do Vídeo</Label>
            <Input
              id="add-song-video"
              type="url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://youtube.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-song-spotify">Spotify</Label>
            <Input
              id="add-song-spotify"
              type="url"
              value={spotifyUrl}
              onChange={(event) => setSpotifyUrl(event.target.value)}
              placeholder="https://open.spotify.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-song-apple">Apple Music</Label>
            <Input
              id="add-song-apple"
              type="url"
              value={appleMusicUrl}
              onChange={(event) => setAppleMusicUrl(event.target.value)}
              placeholder="https://music.apple.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-song-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="add-song-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Louvor, Adoração, Contemporâneo"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createSongMutation.isPending}>
              {createSongMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
