import { Music2, ExternalLink, FileText, Play, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Song } from '@/hooks/useSongs';

interface SongDetailDialogProps {
  song: Song | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SongDetailDialog({ song, open, onOpenChange }: SongDetailDialogProps) {
  if (!song) return null;

  const hasExternalLinks = song.spotify_url || song.apple_music_url || song.video_url || song.chords_url || song.lyrics_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            {song.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Song Info */}
          <div className="flex flex-wrap gap-2">
            {song.artist && (
              <Badge variant="secondary">{song.artist}</Badge>
            )}
            {song.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* External Links */}
          {hasExternalLinks && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Links externos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {song.spotify_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => window.open(song.spotify_url!, '_blank')}
                    >
                      <div className="w-4 h-4 mr-2 rounded-full bg-[#1DB954] flex items-center justify-center">
                        <Play className="h-2 w-2 text-white fill-white" />
                      </div>
                      Spotify
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  )}
                  {song.apple_music_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => window.open(song.apple_music_url!, '_blank')}
                    >
                      <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-b from-[#FC3C44] to-[#8B8B8B] flex items-center justify-center">
                        <Music2 className="h-2 w-2 text-white" />
                      </div>
                      Apple Music
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  )}
                  {song.video_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => window.open(song.video_url!, '_blank')}
                    >
                      <Play className="h-4 w-4 mr-2 text-red-500" />
                      Vídeo
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  )}
                  {song.chords_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => window.open(song.chords_url!, '_blank')}
                    >
                      <FileText className="h-4 w-4 mr-2 text-primary" />
                      Cifra
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  )}
                  {song.lyrics_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => window.open(song.lyrics_url!, '_blank')}
                    >
                      <BookOpen className="h-4 w-4 mr-2 text-primary" />
                      Letra (Link)
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Lyrics */}
          {song.lyrics && (
            <>
              <Separator />
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Letra
                </h4>
                <ScrollArea className="flex-1 rounded-xl bg-secondary/30 p-4">
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {song.lyrics}
                  </pre>
                </ScrollArea>
              </div>
            </>
          )}

          {!song.lyrics && !hasExternalLinks && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma informação adicional disponível para esta música.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
