import { BookOpen, ChevronRight, Music2 } from 'lucide-react';
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
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Repertório</h3>
            <p className="text-sm text-muted-foreground">{songs.length} música(s) para esta escala</p>
          </div>
        </div>

        <ul className="space-y-2.5">
          {songs.map((song, index) => (
            <li
              key={song.id}
              className="flex items-center justify-between rounded-xl border border-border/65 bg-secondary/38 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Music2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-foreground">
                  {index + 1}. {song.title}
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails?.(song.id)}
                className="rounded-xl px-2 text-primary hover:text-primary"
              >
                Ver
                <ChevronRight className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
