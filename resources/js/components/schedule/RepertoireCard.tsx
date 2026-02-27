import { BookOpen, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Song {
  id: string;
  title: string;
}

interface RepertoireCardProps {
  songs: Song[];
  onViewDetails?: (songId: string) => void;
}

export function RepertoireCard({ songs, onViewDetails }: RepertoireCardProps) {
  return (
    <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="repertoire-card">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Repertório</h3>
        </div>
        
        <ul className="space-y-3">
          {songs.map((song, index) => (
            <li key={song.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  {index + 1}. {song.title}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails?.(song.id)}
                className="px-2 text-primary hover:text-primary"
              >
                Ver detalhes
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
