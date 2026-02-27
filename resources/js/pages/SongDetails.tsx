import { useParams, useNavigate } from 'react-router-dom';
import { Music2, ExternalLink, FileText, Play, BookOpen, ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSongs } from '@/hooks/useSongs';
import { Loader2 } from 'lucide-react';

export default function SongDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: songs, isLoading } = useSongs();

  const song = songs?.find(s => s.id === id);

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <BottomNav />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Música não encontrada</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const hasExternalLinks = song.spotify_url || song.apple_music_url || song.video_url || song.chords_url || song.lyrics_url;

  return (
    <div className="page-container pb-24">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <header className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Music2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{song.title}</h1>
            {song.artist && (
              <p className="text-muted-foreground">{song.artist}</p>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {/* Song Info */}
        <div className="flex flex-wrap gap-2 animate-slide-up">
          {song.tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="text-sm py-1 px-3">
              {tag}
            </Badge>
          ))}
        </div>

        {/* External Links */}
        {hasExternalLinks && (
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Separator />
            <h4 className="text-sm font-medium text-muted-foreground">Links externos</h4>
            <div className="grid grid-cols-2 gap-2">
              {song.spotify_url && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.open(song.spotify_url!, '_blank')}
                >
                  <div className="w-5 h-5 mr-2 rounded-full bg-[#1DB954] flex items-center justify-center">
                    <Play className="h-3 w-3 text-white fill-white" />
                  </div>
                  Spotify
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
              {song.apple_music_url && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.open(song.apple_music_url!, '_blank')}
                >
                  <div className="w-5 h-5 mr-2 rounded-full bg-gradient-to-b from-[#FC3C44] to-[#8B8B8B] flex items-center justify-center">
                    <Music2 className="h-3 w-3 text-white" />
                  </div>
                  Apple Music
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
              {song.video_url && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.open(song.video_url!, '_blank')}
                >
                  <Play className="h-5 w-5 mr-2 text-red-500" />
                  Vídeo
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
              {song.chords_url && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.open(song.chords_url!, '_blank')}
                >
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Cifra
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
              {song.lyrics_url && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.open(song.lyrics_url!, '_blank')}
                >
                  <BookOpen className="h-5 w-5 mr-2 text-primary" />
                  Letra (Link)
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Lyrics */}
        {song.lyrics && (
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Separator />
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Letra
            </h4>
            <div className="rounded-xl bg-secondary/30 p-4">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {song.lyrics}
              </pre>
            </div>
          </div>
        )}

        {!song.lyrics && !hasExternalLinks && (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma informação adicional disponível para esta música.
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
