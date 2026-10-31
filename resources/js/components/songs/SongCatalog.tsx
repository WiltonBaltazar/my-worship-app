import { useRef } from 'react';
import { LayoutGrid, List, Rows3, Search, SlidersHorizontal, Tags, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
  CatalogPagination,
  SongCardsView,
  SongGridView,
  SongListView,
  type SongViewMode,
  type SongViewProps,
  songResourceOptions,
} from '@/components/songs/SongViews';
import { ALL_ARTISTS, NO_ARTIST, type SongCatalog as SongCatalogState, type SongSortOption, pageSizeOptions, sortOptions } from '@/hooks/useSongCatalog';

const viewModeOptions: Array<{ value: SongViewMode; label: string; icon: typeof List }> = [
  { value: 'list', label: 'Lista', icon: List },
  { value: 'cards', label: 'Cartões', icon: Rows3 },
  { value: 'grid', label: 'Grade', icon: LayoutGrid },
];

interface SongCatalogProps extends Omit<SongViewProps, 'songs'> {
  catalog: SongCatalogState;
  /** For pages capped at a narrow column, where viewport breakpoints overstate the room. */
  narrow?: boolean;
}

export function SongCatalog({ catalog, narrow = false, ...actions }: SongCatalogProps) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const {
    filteredSongs,
    pagedSongs,
    pageStart,
    totalSongs,
    viewMode,
    activeFilterCount,
    artistFilter,
  } = catalog;

  const changePage = (nextPage: number) => {
    catalog.setPage(nextPage);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const viewProps: SongViewProps = { songs: pagedSongs, ...actions };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className={cn('flex flex-col gap-2', !narrow && 'lg:flex-row')}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={catalog.searchQuery}
              onChange={(event) => catalog.setSearchQuery(event.target.value)}
              placeholder="Buscar por título, artista ou tag..."
              className="rounded-xl border-border bg-card pl-10"
              aria-label="Buscar músicas"
            />
          </div>

          <div className={cn('grid grid-cols-2 gap-2', narrow ? 'md:grid-cols-4' : 'sm:flex sm:flex-wrap')}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start gap-2 rounded-xl bg-card"
                  disabled={catalog.availableTags.length === 0}
                >
                  <Tags className="h-4 w-4" />
                  Tags
                  {catalog.selectedTags.length > 0 && <FilterCount count={catalog.selectedTags.length} />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
                <DropdownMenuLabel>Qualquer uma das tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {catalog.availableTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={catalog.selectedTags.includes(tag)}
                    onCheckedChange={() => catalog.toggleTag(tag)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-start gap-2 rounded-xl bg-card">
                  <SlidersHorizontal className="h-4 w-4" />
                  Recursos
                  {catalog.selectedResources.length > 0 && <FilterCount count={catalog.selectedResources.length} />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Tem todos os recursos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {songResourceOptions.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    checked={catalog.selectedResources.includes(value)}
                    onCheckedChange={() => catalog.toggleResource(value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={artistFilter} onValueChange={catalog.setArtistFilter}>
              <SelectTrigger className={cn('rounded-xl bg-card', !narrow && 'sm:w-44')} aria-label="Filtrar por artista">
                <SelectValue placeholder="Artista" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL_ARTISTS}>Todos os artistas</SelectItem>
                <SelectItem value={NO_ARTIST}>Sem artista</SelectItem>
                {catalog.availableArtists.map((artist) => (
                  <SelectItem key={artist} value={artist}>
                    {artist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={catalog.sort} onValueChange={(value) => catalog.setSort(value as SongSortOption)}>
              <SelectTrigger className={cn('rounded-xl bg-card', !narrow && 'sm:w-44')} aria-label="Ordenar músicas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {catalog.selectedTags.map((tag) => (
              <FilterChip key={`tag-${tag}`} label={tag} onRemove={() => catalog.toggleTag(tag)} />
            ))}
            {catalog.selectedResources.map((resource) => (
              <FilterChip
                key={`resource-${resource}`}
                label={`Com ${songResourceOptions.find((option) => option.value === resource)?.label.toLowerCase()}`}
                onRemove={() => catalog.toggleResource(resource)}
              />
            ))}
            {artistFilter !== ALL_ARTISTS && (
              <FilterChip
                label={artistFilter === NO_ARTIST ? 'Sem artista' : artistFilter}
                onRemove={() => catalog.setArtistFilter(ALL_ARTISTS)}
              />
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={catalog.clearFilters}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      <div ref={resultsRef} className="flex scroll-mt-24 items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filteredSongs.length === 0 ? (
            'Nenhuma música'
          ) : (
            <>
              Mostrando <span className="font-medium text-foreground">{pageStart + 1}–{pageStart + pagedSongs.length}</span> de{' '}
              <span className="font-medium text-foreground">{filteredSongs.length}</span>
              {filteredSongs.length !== totalSongs && ` (de ${totalSongs} no total)`}
            </>
          )}
        </p>

        <ToggleGroup
          type="single"
          variant="outline"
          value={viewMode}
          onValueChange={(value) => value && catalog.changeViewMode(value as SongViewMode)}
          className="justify-start"
          aria-label="Modo de visualização"
        >
          {viewModeOptions.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} className="gap-1.5 rounded-xl bg-card px-3" aria-label={label}>
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {pagedSongs.length > 0 ? (
        <>
          {viewMode === 'list' && <SongListView {...viewProps} />}
          {viewMode === 'cards' && <SongCardsView {...viewProps} />}
          {viewMode === 'grid' && <SongGridView {...viewProps} narrow={narrow} />}

          <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Por página</span>
              <Select value={String(catalog.pageSize)} onValueChange={(value) => catalog.changePageSize(Number(value))}>
                <SelectTrigger className="h-9 w-20 rounded-lg bg-card" aria-label="Músicas por página">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CatalogPagination page={catalog.page} pageCount={catalog.pageCount} onPageChange={changePage} />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-input p-10 text-center text-muted-foreground">
          {totalSongs === 0 ? (
            'Nenhuma música cadastrada ainda.'
          ) : (
            <div className="space-y-3">
              <p>Nenhuma música corresponde à busca e aos filtros.</p>
              {catalog.hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={catalog.clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterCount({ count }: { count: number }) {
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground sm:ml-0">
      {count}
    </span>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium"
      onClick={onRemove}
      aria-label={`Remover filtro ${label}`}
    >
      {label}
      <X className="h-3 w-3" />
    </Button>
  );
}
