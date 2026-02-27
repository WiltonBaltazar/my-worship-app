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
import { type Song, useUpdateSong } from '@/hooks/useSongs';

interface EditSongDialogProps {
  song: Song;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSongDialog({ song, open, onOpenChange }: EditSongDialogProps) {
  const updateSongMutation = useUpdateSong();

  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist ?? '');
  const [chordsUrl, setChordsUrl] = useState(song.chords_url ?? '');
  const [lyricsUrl, setLyricsUrl] = useState(song.lyrics_url ?? '');
  const [lyrics, setLyrics] = useState(song.lyrics ?? '');
  const [videoUrl, setVideoUrl] = useState(song.video_url ?? '');
  const [spotifyUrl, setSpotifyUrl] = useState(song.spotify_url ?? '');
  const [appleMusicUrl, setAppleMusicUrl] = useState(song.apple_music_url ?? '');
  const [tags, setTags] = useState(song.tags?.join(', ') ?? '');

  useEffect(() => {
    setTitle(song.title);
    setArtist(song.artist ?? '');
    setChordsUrl(song.chords_url ?? '');
    setLyricsUrl(song.lyrics_url ?? '');
    setLyrics(song.lyrics ?? '');
    setVideoUrl(song.video_url ?? '');
    setSpotifyUrl(song.spotify_url ?? '');
    setAppleMusicUrl(song.apple_music_url ?? '');
    setTags(song.tags?.join(', ') ?? '');
  }, [song]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await updateSongMutation.mutateAsync({
        id: song.id,
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
    } catch {
      // Toast is handled by hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Música</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-song-title">Título *</Label>
            <Input
              id="edit-song-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-song-artist">Artista</Label>
            <Input
              id="edit-song-artist"
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-song-lyrics">Letra</Label>
            <Textarea
              id="edit-song-lyrics"
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              placeholder="Cole a letra da música aqui..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-song-chords">Link da Cifra</Label>
            <Input
              id="edit-song-chords"
              type="url"
              value={chordsUrl}
              onChange={(event) => setChordsUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-song-lyrics-url">Link Externo da Letra</Label>
            <Input
              id="edit-song-lyrics-url"
              type="url"
              value={lyricsUrl}
              onChange={(event) => setLyricsUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-song-video">Link do Vídeo</Label>
            <Input
              id="edit-song-video"
              type="url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://youtube.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-song-spotify">Spotify</Label>
            <Input
              id="edit-song-spotify"
              type="url"
              value={spotifyUrl}
              onChange={(event) => setSpotifyUrl(event.target.value)}
              placeholder="https://open.spotify.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-song-apple">Apple Music</Label>
            <Input
              id="edit-song-apple"
              type="url"
              value={appleMusicUrl}
              onChange={(event) => setAppleMusicUrl(event.target.value)}
              placeholder="https://music.apple.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-song-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="edit-song-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Louvor, Adoração, Contemporâneo"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateSongMutation.isPending}>
              {updateSongMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
