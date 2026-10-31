import { ChevronLeft, ChevronRight, Edit2, FileText, Guitar, Headphones, Music2, Trash2, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Song } from '@/hooks/useSongs';
import { cn } from '@/lib/utils';

export type SongViewMode = 'list' | 'cards' | 'grid';

export type SongResource = 'chords' | 'lyrics' | 'video' | 'streaming';

export interface SongViewProps {
  songs: Song[];
  onEdit: (song: Song) => void;
  /** Omit to hide the delete action. */
  onDelete?: (song: Song) => void;
  /** Makes rows and cards open the song. */
  onOpen?: (song: Song) => void;
}

export const songResourceOptions: Array<{ value: SongResource; label: string; icon: typeof Guitar }> = [
  { value: 'chords', label: 'Cifra', icon: Guitar },
  { value: 'lyrics', label: 'Letra', icon: FileText },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'streaming', label: 'Streaming', icon: Headphones },
];

// Lyrics can live inline on the song, so the lyrics link is optional.
const resourceLink: Record<SongResource, (song: Song) => string | null> = {
  chords: (song) => song.chords_url,
  lyrics: (song) => song.lyrics_url,
  video: (song) => song.video_url,
  streaming: (song) => song.spotify_url ?? song.apple_music_url,
};

export function songHasResource(song: Song, resource: SongResource) {
  if (resource === 'lyrics') {
    return Boolean(song.lyrics_url || song.lyrics?.trim());
  }

  return Boolean(resourceLink[resource](song));
}

function SongResourceLinks({ song, iconOnly = false, showEmpty = false }: { song: Song; iconOnly?: boolean; showEmpty?: boolean }) {
  const links = songResourceOptions
    .map((option) => ({ ...option, href: resourceLink[option.value](song) }))
    .filter((option): option is typeof option & { href: string } => Boolean(option.href));

  if (links.length === 0) {
    return showEmpty ? <span className="text-muted-foreground">—</span> : null;
  }

  return (
    <div className={cn('flex flex-wrap items-center', iconOnly ? 'gap-1' : 'gap-x-4 gap-y-1 text-sm')}>
      {links.map(({ value, label, icon: Icon, href }) => (
        <a
          key={value}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'inline-flex items-center gap-1 text-primary hover:underline',
            iconOnly && 'h-8 w-8 justify-center rounded-md hover:bg-primary/10 hover:no-underline',
          )}
          aria-label={iconOnly ? `${label} de ${song.title}` : undefined}
          title={iconOnly ? label : undefined}
        >
          <Icon className={iconOnly ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
          {!iconOnly && label}
        </a>
      ))}
    </div>
  );
}

function SongTags({ tags, limit, variant = 'secondary' }: { tags: string[]; limit?: number; variant?: 'secondary' | 'outline' }) {
  if (tags.length === 0) {
    return null;
  }

  const visible = limit ? tags.slice(0, limit) : tags;
  const hidden = tags.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <Badge key={tag} variant={variant} className="text-xs font-normal">
          {tag}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge variant="outline" className="text-xs font-normal text-muted-foreground" title={tags.slice(visible.length).join(', ')}>
          +{hidden}
        </Badge>
      )}
    </div>
  );
}

function SongActions({ song, onEdit, onDelete }: { song: Song } & Omit<SongViewProps, 'songs'>) {
  return (
    // Keep action clicks from also opening the song.
    <div className="flex shrink-0 gap-1" onClick={(event) => event.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(song)} aria-label={`Editar ${song.title}`}>
        <Edit2 className="h-4 w-4" />
      </Button>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(song)}
          aria-label={`Excluir ${song.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// The title is the keyboard target for opening; the row or card handles pointer clicks.
function SongTitle({ song, onOpen, className }: { song: Song; onOpen?: (song: Song) => void; className?: string }) {
  if (!onOpen) {
    return <span className={className}>{song.title}</span>;
  }

  return (
    <button
      type="button"
      className={cn('text-left hover:underline focus-visible:underline focus-visible:outline-none', className)}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(song);
      }}
    >
      {song.title}
    </button>
  );
}

function openProps(song: Song, onOpen?: (song: Song) => void) {
  return onOpen ? { onClick: () => onOpen(song) } : {};
}

export function SongListView({ songs, ...actions }: SongViewProps) {
  return (
    <div className="admin-surface overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead className="hidden md:table-cell">Artista</TableHead>
            <TableHead className="hidden lg:table-cell">Tags</TableHead>
            <TableHead className="hidden sm:table-cell">Recursos</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {songs.map((song) => (
            <TableRow key={song.id} className={cn(actions.onOpen && 'cursor-pointer')} {...openProps(song, actions.onOpen)}>
              <TableCell className="max-w-[14rem] sm:max-w-[18rem]">
                <p className="truncate font-medium text-foreground">
                  <SongTitle song={song} onOpen={actions.onOpen} />
                </p>
                {song.artist && <p className="truncate text-xs text-muted-foreground md:hidden">{song.artist}</p>}
              </TableCell>
              <TableCell className="hidden max-w-[12rem] truncate text-muted-foreground md:table-cell">
                {song.artist || '—'}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {(song.tags ?? []).length > 0 ? <SongTags tags={song.tags} limit={2} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <SongResourceLinks song={song} iconOnly showEmpty />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <SongActions song={song} {...actions} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SongCardsView({ songs, ...actions }: SongViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {songs.map((song) => (
        <Card
          key={song.id}
          className={cn('admin-surface', actions.onOpen && 'cursor-pointer transition-shadow hover:shadow-md')}
          {...openProps(song, actions.onOpen)}
        >
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Music2 className="h-6 w-6 text-primary" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      <SongTitle song={song} onOpen={actions.onOpen} />
                    </h3>
                    {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
                  </div>
                  <SongTags tags={song.tags ?? []} />
                  <SongResourceLinks song={song} />
                </div>
              </div>

              <div className="self-end sm:self-start">
                <SongActions song={song} {...actions} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SongGridView({ songs, narrow = false, ...actions }: SongViewProps & { narrow?: boolean }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 min-[480px]:grid-cols-2',
        narrow ? 'md:grid-cols-3' : 'lg:grid-cols-3 2xl:grid-cols-4',
      )}
    >
      {songs.map((song) => (
        <Card
          key={song.id}
          className={cn('admin-surface flex flex-col', actions.onOpen && 'cursor-pointer transition-shadow hover:shadow-md')}
          {...openProps(song, actions.onOpen)}
        >
          <CardContent className="flex flex-1 flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Music2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-semibold leading-snug text-foreground">
                  <SongTitle song={song} onOpen={actions.onOpen} />
                </h3>
                <p className="truncate text-sm text-muted-foreground">{song.artist || 'Artista não informado'}</p>
              </div>
            </div>

            <SongTags tags={song.tags ?? []} limit={3} variant="outline" />

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
              <SongResourceLinks song={song} iconOnly />
              <div className="ml-auto">
                <SongActions song={song} {...actions} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Page numbers with ellipses: 1 … 4 5 6 … 12
function pageWindow(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  return sorted.flatMap((page, index) => (index > 0 && page - sorted[index - 1] > 1 ? ['gap' as const, page] : [page]));
}

interface CatalogPaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function CatalogPagination({ page, pageCount, onPageChange }: CatalogPaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="Paginação do repertório" className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1 bg-card px-2.5"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Anterior</span>
      </Button>

      <span className="px-2 text-sm text-muted-foreground sm:hidden">
        {page} / {pageCount}
      </span>

      <ul className="hidden items-center gap-1 sm:flex">
        {pageWindow(page, pageCount).map((item, index) => (
          <li key={item === 'gap' ? `gap-${index}` : item}>
            {item === 'gap' ? (
              <span className="flex h-9 w-6 items-center justify-center text-muted-foreground" aria-hidden>
                …
              </span>
            ) : (
              <Button
                variant={item === page ? 'default' : 'ghost'}
                size="sm"
                className="h-9 min-w-9 px-2 tabular-nums"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
              >
                {item}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1 bg-card px-2.5"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próxima página"
      >
        <span className="hidden sm:inline">Próxima</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
