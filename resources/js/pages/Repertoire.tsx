import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Music, Loader2, Filter, Plus, X, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddSongDialog } from '@/components/admin/AddSongDialog';
import { EditSongDialog } from '@/components/admin/EditSongDialog';
import { type Song, useSongs } from '@/hooks/useSongs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SONGS_PER_PAGE = 10;

export default function Repertoire() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(SONGS_PER_PAGE);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const navigate = useNavigate();
  const { data: songs, isLoading } = useSongs();
  const loaderRef = useRef<HTMLDivElement>(null);

  // Extract unique tags from songs
  const availableTags = useMemo(() => {
    if (!songs) return [];

    const tags = new Set<string>();

    songs.forEach(song => {
      song.tags?.forEach(tag => tags.add(tag));
    });

    return Array.from(tags).sort();
  }, [songs]);

  // Filter songs based on search and filters
  const filteredSongs = useMemo(() => {
    if (!songs) return [];
    
    return songs.filter(song => {
      // Search filter
      const matchesSearch = !searchQuery || 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Tag filter
      const matchesTags = selectedTags.length === 0 || 
        song.tags?.some(tag => selectedTags.includes(tag));
      
      return matchesSearch && matchesTags;
    });
  }, [songs, searchQuery, selectedTags]);

  // Songs to display (with pagination)
  const displayedSongs = useMemo(() => {
    return filteredSongs.slice(0, displayCount);
  }, [filteredSongs, displayCount]);

  const hasMore = displayCount < filteredSongs.length;
  const activeFiltersCount = selectedTags.length;

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(SONGS_PER_PAGE);
  }, [searchQuery, selectedTags]);

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore) {
      setDisplayCount(prev => prev + SONGS_PER_PAGE);
    }
  }, [hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });
    
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    
    return () => observer.disconnect();
  }, [handleObserver]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
  };

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page-container pb-20">
      <Header title="Repertório" showNotifications />

      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar música
          </Button>
        </div>

        {/* Search and Filter Row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar músicas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {availableTags.length > 0 && (
                <>
                  <DropdownMenuLabel>Tags</DropdownMenuLabel>
                  {availableTags.map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                    >
                      {tag}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}
              
              {activeFiltersCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-destructive"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTags.map(tag => (
              <Button
                key={tag} 
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="ml-1 h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filteredSongs.length} música{filteredSongs.length !== 1 ? 's' : ''} encontrada{filteredSongs.length !== 1 ? 's' : ''}
        </p>

        {displayedSongs.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || activeFiltersCount > 0 ? 'Nenhuma música encontrada' : 'Nenhuma música cadastrada'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedSongs.map((song) => (
            <Card
                key={song.id} 
                className="cursor-pointer transition-all hover:-translate-y-0.5 hover:bg-secondary/40"
                onClick={() => navigate(`/songs/${song.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{song.title}</h3>
                      {song.artist && (
                        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {song.tags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 shrink-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingSong(song);
                      }}
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Infinite scroll loader */}
            {hasMore && (
              <div ref={loaderRef} className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>

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

      <BottomNav />
    </div>
  );
}
