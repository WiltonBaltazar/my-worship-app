import { useEffect, useMemo, useState } from 'react';
import { type SongResource, type SongViewMode, songHasResource } from '@/components/songs/SongViews';
import type { Song } from '@/hooks/useSongs';

export const ALL_ARTISTS = '__all__';
export const NO_ARTIST = '__none__';

// Multiples of 12 fill every grid column count (1–4) evenly.
export const pageSizeOptions = [12, 24, 48, 96];

export type SongSortOption = 'title-asc' | 'title-desc' | 'artist' | 'recent';

export const sortOptions: Array<{ value: SongSortOption; label: string }> = [
  { value: 'title-asc', label: 'Título (A–Z)' },
  { value: 'title-desc', label: 'Título (Z–A)' },
  { value: 'artist', label: 'Artista' },
  { value: 'recent', label: 'Mais recentes' },
];

const viewModes: SongViewMode[] = ['list', 'cards', 'grid'];

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function compareSongs(sort: SongSortOption) {
  return (a: Song, b: Song) => {
    switch (sort) {
      case 'title-desc':
        return collator.compare(b.title, a.title);
      case 'artist':
        // Songs without an artist go last.
        if (!a.artist !== !b.artist) {
          return a.artist ? -1 : 1;
        }
        return collator.compare(a.artist ?? '', b.artist ?? '') || collator.compare(a.title, b.title);
      case 'recent':
        return b.created_at.localeCompare(a.created_at);
      default:
        return collator.compare(a.title, b.title);
    }
  };
}

function readStored<T>(key: string, isValid: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw === null ? null : JSON.parse(raw);
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
  }

  return fallback;
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not persisting the preference is fine.
  }
}

const isViewMode = (value: unknown): value is SongViewMode => viewModes.includes(value as SongViewMode);
const isPageSize = (value: unknown): value is number => pageSizeOptions.includes(value as number);

/** `storageKey` prefixes the remembered view mode and page size, e.g. `wora:admin-repertoire`. */
export function useSongCatalog(songs: Song[] | undefined, storageKey: string) {
  const viewModeKey = `${storageKey}-view`;
  const pageSizeKey = `${storageKey}-page-size`;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<SongResource[]>([]);
  const [artistFilter, setArtistFilter] = useState(ALL_ARTISTS);
  const [sort, setSort] = useState<SongSortOption>('title-asc');
  const [viewMode, setViewMode] = useState<SongViewMode>(() => readStored(viewModeKey, isViewMode, 'list'));
  const [pageSize, setPageSize] = useState(() => readStored(pageSizeKey, isPageSize, 24));
  const [page, setPage] = useState(1);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    songs?.forEach((song) => song.tags?.forEach((tag) => tags.add(tag)));
    return [...tags].sort(collator.compare);
  }, [songs]);

  const availableArtists = useMemo(() => {
    const artists = new Set<string>();
    songs?.forEach((song) => song.artist && artists.add(song.artist));
    return [...artists].sort(collator.compare);
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const query = normalize(searchQuery.trim());

    return (songs ?? [])
      .filter((song) => {
        const matchesSearch =
          !query ||
          normalize(song.title).includes(query) ||
          normalize(song.artist ?? '').includes(query) ||
          (song.tags ?? []).some((tag) => normalize(tag).includes(query));
        const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => song.tags?.includes(tag));
        const matchesResources = selectedResources.every((resource) => songHasResource(song, resource));
        const matchesArtist =
          artistFilter === ALL_ARTISTS || (artistFilter === NO_ARTIST ? !song.artist : song.artist === artistFilter);

        return matchesSearch && matchesTags && matchesResources && matchesArtist;
      })
      .sort(compareSongs(sort));
  }, [songs, searchQuery, selectedTags, selectedResources, artistFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredSongs.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedSongs = filteredSongs.slice(pageStart, pageStart + pageSize);

  // Any change to what is listed starts over from the first page.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedTags, selectedResources, artistFilter, sort, pageSize]);

  const activeFilterCount = selectedTags.length + selectedResources.length + (artistFilter === ALL_ARTISTS ? 0 : 1);

  return {
    totalSongs: songs?.length ?? 0,
    availableTags,
    availableArtists,
    filteredSongs,
    pagedSongs,
    pageStart,
    page: currentPage,
    pageCount,
    setPage,
    pageSize,
    changePageSize: (size: number) => {
      setPageSize(size);
      writeStored(pageSizeKey, size);
    },
    viewMode,
    changeViewMode: (mode: SongViewMode) => {
      setViewMode(mode);
      writeStored(viewModeKey, mode);
    },
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag: (tag: string) =>
      setSelectedTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag])),
    selectedResources,
    toggleResource: (resource: SongResource) =>
      setSelectedResources((current) =>
        current.includes(resource) ? current.filter((r) => r !== resource) : [...current, resource],
      ),
    artistFilter,
    setArtistFilter,
    sort,
    setSort,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0 || searchQuery.trim() !== '',
    clearFilters: () => {
      setSearchQuery('');
      setSelectedTags([]);
      setSelectedResources([]);
      setArtistFilter(ALL_ARTISTS);
    },
  };
}

export type SongCatalog = ReturnType<typeof useSongCatalog>;
