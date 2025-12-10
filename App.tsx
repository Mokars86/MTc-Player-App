
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AppView, MediaItem, MediaType, PlayerState, Theme, RepeatMode, GestureType, GestureAction, GestureSettings, EqSettings, SleepTimer, Playlist } from './types';
import { DEMO_MEDIA } from './constants';
import { Icons } from './components/Icon';
import HomeView from './views/HomeView';
import PlayerView from './views/PlayerView';
import AIChatView from './views/AIChatView';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-app-bg flex flex-col items-center justify-center animate-fade-in">
      <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-brand-DEFAULT rounded-2xl rotate-6 opacity-20 animate-pulse"></div>
          <div className="absolute inset-0 bg-brand-dark rounded-2xl -rotate-6 opacity-20 animate-pulse delay-75"></div>
          <div className="relative bg-app-surface w-full h-full rounded-2xl border border-brand-accent/20 flex items-center justify-center shadow-2xl">
                <Icons.Play className="w-12 h-12 text-brand-accent fill-brand-accent" />
          </div>
      </div>
      <h1 className="text-4xl font-bold text-app-text tracking-wider mb-2">MTc Player</h1>
      <p className="text-brand-light text-sm tracking-widest uppercase opacity-80">Premium Media Experience</p>
      
      <div className="absolute bottom-10 w-48 h-1 bg-app-card rounded-full overflow-hidden">
        <div className="h-full bg-brand-accent animate-[slideUp_2s_ease-in-out_infinite] w-full origin-left scale-x-0" style={{ animationName: 'progress' }}></div>
      </div>
      <style>{`
        @keyframes progress {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [currentTrack, setCurrentTrack] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [theme, setTheme] = useState<Theme>('light');
  
  // Player Logic State
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.OFF);

  // Advanced Audio State
  const [eqSettings, setEqSettings] = useState<EqSettings>({ preset: 'Flat', gains: { 60: 0, 250: 0, 1000: 0, 4000: 0, 16000: 0 } });
  const [sleepTimer, setSleepTimer] = useState<SleepTimer>({ active: false, endTime: null, fadeDuration: 60000 });

  // Library & Favorites State
  const [localLibrary, setLocalLibrary] = useState<MediaItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('mtc_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [libraryTab, setLibraryTab] = useState<'ALL' | 'FAVORITES' | 'PLAYLISTS' | 'ALBUMS' | 'ARTISTS' | 'LOCAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Playlist & Collection State
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('mtc_playlists');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Replaces activePlaylistId to generic collection selection
  const [selectedCollection, setSelectedCollection] = useState<{ type: 'PLAYLIST' | 'ALBUM' | 'ARTIST', id: string, title: string } | null>(null);
  const [trackToAction, setTrackToAction] = useState<MediaItem | null>(null); // Track selected for adding to playlist

  // Gesture Settings
  const [gestureSettings, setGestureSettings] = useState<GestureSettings>(() => {
    const saved = localStorage.getItem('mtc_gestures');
    return saved ? JSON.parse(saved) : {
      [GestureType.SWIPE]: GestureAction.SEEK,
      [GestureType.PINCH]: GestureAction.ZOOM,
      [GestureType.CIRCLE]: GestureAction.VOLUME
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const handleNextRef = useRef<(autoTrigger?: boolean) => void>(() => {});

  // Persistence
  useEffect(() => {
    localStorage.setItem('mtc_favorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('mtc_gestures', JSON.stringify(gestureSettings));
  }, [gestureSettings]);

  useEffect(() => {
    localStorage.setItem('mtc_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        switch(e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (audioRef.current) handleSeek(Math.min(duration, currentTime + 5));
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (audioRef.current) handleSeek(Math.max(0, currentTime - 5));
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (audioRef.current) {
                    const newVol = Math.min(1, audioRef.current.volume + 0.1);
                    audioRef.current.volume = newVol;
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (audioRef.current) {
                    const newVol = Math.max(0, audioRef.current.volume - 0.1);
                    audioRef.current.volume = newVol;
                }
                break;
            case 'KeyM':
                 if (audioRef.current) audioRef.current.volume = audioRef.current.volume > 0 ? 0 : 1;
                 break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, currentTime, isPlaying]);

  // Sleep Timer Logic
  useEffect(() => {
      if (!sleepTimer.active || !sleepTimer.endTime) return;

      const interval = setInterval(() => {
          const now = Date.now();
          if (now >= sleepTimer.endTime!) {
              setIsPlaying(false);
              if (audioRef.current) audioRef.current.pause();
              setSleepTimer(prev => ({ ...prev, active: false, endTime: null }));
              clearInterval(interval);
          }
      }, 1000);

      return () => clearInterval(interval);
  }, [sleepTimer, isPlaying]);

  const setTimer = (minutes: number | null) => {
      if (minutes === null) {
          setSleepTimer({ active: false, endTime: null, fadeDuration: 60000 });
      } else {
          setSleepTimer({ 
              active: true, 
              endTime: Date.now() + minutes * 60 * 1000, 
              fadeDuration: 60000 
          });
      }
  };

  const allMedia = useMemo(() => [...localLibrary, ...DEMO_MEDIA], [localLibrary]);

  // Grouping Logic
  const albums = useMemo(() => {
      const map = new Map<string, MediaItem[]>();
      allMedia.forEach(m => {
          const albumName = m.album || 'Unknown Album';
          if (!map.has(albumName)) map.set(albumName, []);
          map.get(albumName)!.push(m);
      });
      return map;
  }, [allMedia]);

  const artists = useMemo(() => {
      const map = new Map<string, MediaItem[]>();
      allMedia.forEach(m => {
          const artistName = m.artist || 'Unknown Artist';
          if (!map.has(artistName)) map.set(artistName, []);
          map.get(artistName)!.push(m);
      });
      return map;
  }, [allMedia]);

  const filteredMedia = useMemo(() => {
    let media = allMedia;
    
    // Detailed Collection View Filtering
    if (selectedCollection) {
        if (selectedCollection.type === 'PLAYLIST') {
             const playlist = playlists.find(p => p.id === selectedCollection.id);
             if (playlist) {
                 media = playlist.tracks.map(id => allMedia.find(m => m.id === id)).filter(Boolean) as MediaItem[];
             } else {
                 media = [];
             }
        } else if (selectedCollection.type === 'ALBUM') {
             media = albums.get(selectedCollection.title) || [];
        } else if (selectedCollection.type === 'ARTIST') {
             media = artists.get(selectedCollection.title) || [];
        }
    } else {
        // Standard library filtering
        if (libraryTab === 'FAVORITES') {
          media = media.filter(m => favorites.has(m.id));
        } else if (libraryTab === 'LOCAL') {
          media = localLibrary;
        } else if (libraryTab === 'PLAYLISTS' || libraryTab === 'ALBUMS' || libraryTab === 'ARTISTS') {
           // These tabs display grids, not list of tracks directly
           media = [];
        }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // If we are in grid views, we might handle search there, but usually search filters tracks
      // For simplicity, if searching, we show matching tracks globally unless in a collection
      if (!selectedCollection && (libraryTab === 'PLAYLISTS' || libraryTab === 'ALBUMS' || libraryTab === 'ARTISTS')) {
          // Could implement specific search logic for these, but let's fall back to track search for now
      }
      
      media = media.filter(m => 
        m.title.toLowerCase().includes(query) || 
        m.artist.toLowerCase().includes(query) ||
        m.moods?.some(mood => mood.toLowerCase().includes(query))
      );
    }
    return media;
  }, [allMedia, localLibrary, libraryTab, favorites, searchQuery, selectedCollection, playlists, albums, artists]);

  const playTrack = useCallback(async (track: MediaItem) => {
    if (!audioRef.current) return;
    setCurrentTrack(track);
    
    if (track.type === MediaType.VIDEO) {
      audioRef.current.pause();
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(track.duration || 0);
      return;
    }

    try {
      audioRef.current.pause(); 
      audioRef.current.src = track.mediaUrl;
      audioRef.current.load();
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
          await playPromise;
      }
      setIsPlaying(true);
    } catch (error: any) {
      if (error.name === 'AbortError') {
      } else {
          console.error("PlayTrack failed:", error);
          setIsPlaying(false);
      }
    }
  }, []);

  const handleNext = useCallback((autoTrigger = false) => {
     if(!currentTrack) return;
     if (autoTrigger && repeatMode === RepeatMode.ONE) {
        if (currentTrack.type === MediaType.VIDEO) {
             playTrack(currentTrack);
        } else if (audioRef.current) {
             audioRef.current.currentTime = 0;
             audioRef.current.play().catch(() => {});
             setIsPlaying(true);
        }
        return;
     }

     const list = filteredMedia.length > 0 ? filteredMedia : allMedia;
     const currentIdx = list.findIndex(t => t.id === currentTrack.id);
     
     if (shuffleOn) {
        let nextIdx = Math.floor(Math.random() * list.length);
        if (list.length > 1 && nextIdx === currentIdx) {
            nextIdx = (nextIdx + 1) % list.length;
        }
        playTrack(list[nextIdx]);
        return;
     }

     if (currentIdx === -1) {
         playTrack(list[0]);
         return;
     }

     const nextIdx = currentIdx + 1;
     if (nextIdx >= list.length) {
         if (repeatMode === RepeatMode.ALL) {
             playTrack(list[0]); 
         } else {
             setIsPlaying(false); 
             if (!autoTrigger) {
                 playTrack(list[0]); 
             }
         }
     } else {
         playTrack(list[nextIdx]);
     }
  }, [currentTrack, filteredMedia, allMedia, shuffleOn, repeatMode, playTrack]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handlePrev = useCallback(() => {
     if(!currentTrack) return;
     const list = filteredMedia.length > 0 ? filteredMedia : allMedia;
     const currentIdx = list.findIndex(t => t.id === currentTrack.id);
     
     if (currentTime > 3) {
         if (currentTrack.type !== MediaType.VIDEO && audioRef.current) {
             audioRef.current.currentTime = 0;
         } else {
             playTrack(currentTrack);
         }
         return;
     }

     const prevIdx = (currentIdx - 1 + list.length) % list.length;
     playTrack(list[prevIdx]);
  }, [currentTrack, filteredMedia, allMedia, playTrack, currentTime]);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous"; 
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => { handleNextRef.current(true); };
    const onError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        if (target.error && target.error.code !== target.error.MEDIA_ERR_ABORTED) {
            console.error("Audio playback error:", target.error.code, target.error.message);
        }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, []); 

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const removeFromLibrary = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Remove this track from your local library?")) {
        setLocalLibrary(prev => prev.filter(item => item.id !== id));
    }
  };

  const clearLocalLibrary = () => {
      if (confirm("Clear all local tracks? This action cannot be undone.")) {
          setLocalLibrary([]);
      }
  };

  const toggleShuffle = () => setShuffleOn(prev => !prev);
  
  const toggleRepeat = () => {
      setRepeatMode(prev => {
          if (prev === RepeatMode.OFF) return RepeatMode.ALL;
          if (prev === RepeatMode.ALL) return RepeatMode.ONE;
          return RepeatMode.OFF;
      });
  };

  // --- PLAYLIST LOGIC ---
  const createPlaylist = () => {
      const name = prompt("Enter playlist name:");
      if (!name) return;
      const newPlaylist: Playlist = {
          id: `pl-${Date.now()}`,
          name,
          tracks: [],
          createdAt: Date.now()
      };
      setPlaylists(prev => [newPlaylist, ...prev]);
  };

  const deletePlaylist = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm("Delete this playlist?")) {
          setPlaylists(prev => prev.filter(p => p.id !== id));
          if (selectedCollection?.id === id) setSelectedCollection(null);
      }
  };

  const addToPlaylist = (playlistId: string, trackId: string) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId && !p.tracks.includes(trackId)) {
              return { ...p, tracks: [...p.tracks, trackId] };
          }
          return p;
      }));
      setTrackToAction(null);
  };

  const removeFromPlaylist = (playlistId: string, trackId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
              return { ...p, tracks: p.tracks.filter(id => id !== trackId) };
          }
          return p;
      }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newTracks: MediaItem[] = Array.from(files).map((file: File, index) => {
        const isVideo = file.type.startsWith('video');
        const objectUrl = URL.createObjectURL(file);
        
        let title = file.name.replace(/\.[^/.]+$/, ""); 
        let artist = 'Local Artist';

        if (title.includes('-')) {
            const parts = title.split('-');
            if (parts.length >= 2) {
                artist = parts[0].trim();
                title = parts.slice(1).join('-').trim();
            }
        }

        return {
            id: `local-${Date.now()}-${index}`,
            title: title,
            artist: artist,
            album: 'Local Uploads',
            coverUrl: isVideo ? '' : 'https://picsum.photos/400/400?grayscale', 
            mediaUrl: objectUrl,
            type: isVideo ? MediaType.VIDEO : MediaType.MUSIC,
            duration: 0, 
            moods: ['Local']
        };
    });

    setLocalLibrary(prev => [...newTracks, ...prev]);
    setLibraryTab('LOCAL');
    setCurrentView(AppView.LIBRARY);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      if (currentTrack.type !== MediaType.VIDEO && audioRef.current) {
          audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (currentTrack.type !== MediaType.VIDEO && audioRef.current) {
        audioRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.error("Playback failed", e);
        });
      }
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (currentTrack?.type !== MediaType.VIDEO && audioRef.current) {
        audioRef.current.currentTime = time;
    }
  };

  const updateGesture = (type: GestureType, action: GestureAction) => {
    setGestureSettings(prev => ({ ...prev, [type]: action }));
  };

  if (showSplash) {
      return (
        <div className={theme === 'light' ? 'light-theme' : ''}>
          <SplashScreen onComplete={() => setShowSplash(false)} />
        </div>
      );
  }

  return (
    <div className={`${theme === 'light' ? 'light-theme' : ''} h-full w-full`}>
        <div className="flex flex-col h-screen bg-app-bg text-app-text overflow-hidden relative font-sans selection:bg-brand-accent selection:text-white transition-colors duration-300">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*,video/*" multiple className="hidden" />
        
        {/* ADD TO PLAYLIST MODAL */}
        {trackToAction && (
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setTrackToAction(null)}>
                <div className="bg-app-card border border-app-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-surface">
                        <h3 className="font-bold text-app-text">Add to Playlist</h3>
                        <button onClick={() => setTrackToAction(null)}><Icons.X className="w-5 h-5 text-app-subtext hover:text-app-text" /></button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <button onClick={() => { createPlaylist(); }} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-app-bg text-brand-accent font-medium border-b border-app-border/50">
                            <Icons.FolderPlus className="w-5 h-5" /> Create New Playlist
                        </button>
                        {playlists.map(p => (
                            <button key={p.id} onClick={() => addToPlaylist(p.id, trackToAction.id)} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-app-bg text-app-text">
                                <span className="truncate">{p.name}</span>
                                <span className="text-xs text-app-subtext">{p.tracks.length} tracks</span>
                            </button>
                        ))}
                        {playlists.length === 0 && <div className="p-4 text-center text-sm text-app-subtext">No playlists yet.</div>}
                    </div>
                </div>
            </div>
        )}

        <main className="flex-1 overflow-y-auto pb-20 scroll-smooth">
            {currentView === AppView.HOME && (
                <HomeView onPlayDemo={() => playTrack(DEMO_MEDIA[0])} />
            )}
            {currentView === AppView.LIBRARY && (
                <div className="p-6 animate-slide-up min-h-full">
                    {/* Library Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                             {selectedCollection ? (
                                 <button onClick={() => setSelectedCollection(null)} className="p-1 hover:bg-app-surface rounded-full"><Icons.SkipBack className="w-6 h-6 rotate-180" /></button>
                             ) : null}
                             <h1 className="text-3xl font-bold text-app-text">{selectedCollection ? selectedCollection.title : 'Library'}</h1>
                        </div>
                        <div className="flex gap-2">
                             {libraryTab === 'LOCAL' && localLibrary.length > 0 && !selectedCollection && (
                                <button onClick={clearLocalLibrary} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-2 rounded-lg transition-colors border border-red-500/20">
                                    <Icons.Trash2 className="w-5 h-5" />
                                    <span className="hidden sm:inline text-sm font-bold">Clear All</span>
                                </button>
                             )}
                             {!selectedCollection && (
                                 <button onClick={triggerFileUpload} className="flex items-center gap-2 bg-brand-dark hover:bg-brand-DEFAULT text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg">
                                     <Icons.PlusCircle className="w-5 h-5" /><span className="hidden sm:inline">Import</span>
                                 </button>
                             )}
                        </div>
                    </div>

                    {!selectedCollection && (
                        <>
                            <div className="relative mb-6">
                                <Icons.Search className="absolute left-4 top-3.5 w-5 h-5 text-app-subtext" />
                                <input type="text" placeholder="Search tracks, artists, moods..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-app-surface border border-app-border rounded-xl py-3 pl-12 pr-4 text-app-text placeholder-app-subtext focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all shadow-sm" />
                            </div>

                            <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
                                {(['ALL', 'FAVORITES', 'PLAYLISTS', 'ALBUMS', 'ARTISTS', 'LOCAL'] as const).map(tab => (
                                    <button key={tab} onClick={() => setLibraryTab(tab)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${libraryTab === tab ? 'bg-brand-accent text-white shadow-md' : 'bg-app-surface text-app-subtext hover:bg-app-card hover:text-app-text border border-app-border'}`}>
                                        {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* PLAYLISTS TAB VIEW */}
                    {!selectedCollection && libraryTab === 'PLAYLISTS' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            <button onClick={createPlaylist} className="aspect-square bg-app-surface border-2 border-dashed border-app-border rounded-xl flex flex-col items-center justify-center text-app-subtext hover:text-brand-accent hover:border-brand-accent transition-colors group">
                                <Icons.FolderPlus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-sm">Create New</span>
                            </button>
                            {playlists.map(playlist => {
                                const covers = playlist.tracks.slice(0, 4).map(tid => allMedia.find(m => m.id === tid)?.coverUrl).filter(Boolean);
                                return (
                                    <div key={playlist.id} onClick={() => setSelectedCollection({ type: 'PLAYLIST', id: playlist.id, title: playlist.name })} className="group relative aspect-square bg-app-card rounded-xl overflow-hidden cursor-pointer shadow-md border border-app-border">
                                        {covers.length > 0 ? (
                                            <div className="w-full h-full grid grid-cols-2">
                                                {covers.length === 1 ? (
                                                    <img src={covers[0]} className="col-span-2 row-span-2 w-full h-full object-cover" />
                                                ) : (
                                                    [0,1,2,3].map(i => (
                                                        <div key={i} className="w-full h-full relative">
                                                            {covers[i] ? <img src={covers[i]} className="w-full h-full object-cover" /> : <div className="bg-app-bg w-full h-full"></div>}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-brand-dark/20 text-brand-light"><Icons.ListMusic className="w-10 h-10 opacity-50" /></div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                                            <h3 className="font-bold text-white truncate">{playlist.name}</h3>
                                            <p className="text-xs text-gray-300">{playlist.tracks.length} tracks</p>
                                        </div>
                                        <button onClick={(e) => deletePlaylist(playlist.id, e)} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icons.Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* ALBUMS TAB VIEW */}
                    {!selectedCollection && libraryTab === 'ALBUMS' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {Array.from(albums.entries()).map(([albumName, tracks]) => (
                                <div key={albumName} onClick={() => setSelectedCollection({ type: 'ALBUM', id: albumName, title: albumName })} className="group cursor-pointer">
                                    <div className="aspect-square bg-app-card rounded-xl overflow-hidden mb-2 shadow-sm relative border border-app-border">
                                        <img src={tracks[0].coverUrl} alt={albumName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                                    </div>
                                    <h3 className="font-bold text-sm text-app-text truncate">{albumName}</h3>
                                    <p className="text-xs text-app-subtext truncate">{tracks[0].artist}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ARTISTS TAB VIEW */}
                    {!selectedCollection && libraryTab === 'ARTISTS' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {Array.from(artists.entries()).map(([artistName, tracks]) => (
                                <div key={artistName} onClick={() => setSelectedCollection({ type: 'ARTIST', id: artistName, title: artistName })} className="group cursor-pointer flex flex-col items-center text-center p-4 bg-app-surface border border-app-border rounded-xl hover:bg-app-card transition-colors">
                                    <div className="w-24 h-24 rounded-full overflow-hidden mb-3 shadow-md border-2 border-app-border group-hover:border-brand-accent transition-colors">
                                        <img src={tracks[0].coverUrl} alt={artistName} className="w-full h-full object-cover" />
                                    </div>
                                    <h3 className="font-bold text-sm text-app-text truncate w-full">{artistName}</h3>
                                    <p className="text-xs text-app-subtext">{tracks.length} tracks</p>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* LIST OF TRACKS (Filtered / Details) */}
                    {((!selectedCollection && !['PLAYLISTS', 'ALBUMS', 'ARTISTS'].includes(libraryTab)) || selectedCollection) && (
                        <div className="space-y-1">
                            {filteredMedia.length > 0 ? (
                                <div className="grid gap-3">
                                    {selectedCollection && (
                                         <div className="flex gap-4 mb-4">
                                             <button onClick={() => { playTrack(filteredMedia[0]); }} className="flex items-center gap-2 bg-brand-accent text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-brand-light transition transform hover:scale-105">
                                                 <Icons.Play className="w-5 h-5 fill-current" /> Play All
                                             </button>
                                             <button onClick={() => setShuffleOn(true)} className="flex items-center gap-2 bg-app-surface text-app-text border border-app-border px-4 py-3 rounded-full font-bold hover:bg-app-card transition">
                                                 <Icons.Shuffle className="w-5 h-5" /> Shuffle
                                             </button>
                                         </div>
                                    )}
                                    {filteredMedia.map(media => (
                                        <div key={`${media.id}-${selectedCollection?.id || 'list'}`} onClick={() => playTrack(media)} className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border border-transparent ${currentTrack?.id === media.id ? 'bg-brand-accent/10 border-brand-accent/20' : 'bg-app-surface hover:bg-app-card hover:shadow-md border-app-border'}`}>
                                            <div className="relative w-12 h-12 flex-shrink-0">
                                                {media.type === MediaType.VIDEO ? (
                                                    <div className="w-full h-full rounded-lg bg-black/80 flex items-center justify-center text-white overflow-hidden">
                                                        {media.coverUrl ? (
                                                            <img src={media.coverUrl} className="w-full h-full object-cover opacity-60" />
                                                        ) : ( <Icons.Maximize2 className="w-5 h-5 relative z-10" /> )}
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><Icons.Play className="w-3 h-3 fill-white text-white ml-0.5" /></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-full h-full">
                                                        {media.id.startsWith('local') ? (
                                                            <div className="w-full h-full rounded-lg bg-brand-dark/30 flex items-center justify-center text-brand-light"><Icons.Music className="w-6 h-6" /></div>
                                                        ) : ( <img src={media.coverUrl} className="w-full h-full rounded-lg object-cover shadow-sm" alt={media.title} /> )}
                                                    </div>
                                                )}
                                                {currentTrack?.id === media.id && isPlaying && (
                                                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center z-20"><Icons.Activity className="w-5 h-5 text-brand-accent animate-pulse" /></div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-bold text-sm md:text-base truncate ${currentTrack?.id === media.id ? 'text-brand-accent' : 'text-app-text'}`}>{media.title}</h3>
                                                <p className="text-xs md:text-sm text-app-subtext truncate flex items-center gap-2">{media.artist} {media.type === MediaType.VIDEO && <span className="bg-app-card px-1.5 py-0.5 rounded text-[10px] border border-app-border">VIDEO</span>}</p>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                <button onClick={(e) => toggleFavorite(media.id, e)} className="p-2 rounded-full hover:bg-app-bg transition-colors">
                                                    <Icons.Heart className={`w-5 h-5 transition-transform active:scale-90 ${favorites.has(media.id) ? 'fill-brand-accent text-brand-accent' : 'text-app-subtext group-hover:text-app-text'}`} />
                                                </button>
                                                {selectedCollection?.type === 'PLAYLIST' ? (
                                                     <button onClick={(e) => removeFromPlaylist(selectedCollection.id, media.id, e)} className="p-2 rounded-full hover:bg-red-500/10 text-app-subtext hover:text-red-500 transition-colors" title="Remove from Playlist">
                                                         <Icons.X className="w-5 h-5" />
                                                     </button>
                                                ) : (
                                                     <button onClick={(e) => { e.stopPropagation(); setTrackToAction(media); }} className="p-2 rounded-full hover:bg-app-bg text-app-subtext hover:text-brand-accent transition-colors" title="Add to Playlist">
                                                         <Icons.ListPlus className="w-5 h-5" />
                                                     </button>
                                                )}
                                                {media.id.startsWith('local') && !selectedCollection && (
                                                     <button onClick={(e) => removeFromLibrary(media.id, e)} className="p-2 rounded-full hover:bg-red-500/10 text-app-subtext hover:text-red-500 transition-colors" title="Delete File">
                                                         <Icons.Trash2 className="w-5 h-5" />
                                                     </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-app-subtext">
                                    <Icons.Music className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No tracks found.</p>
                                    {libraryTab === 'FAVORITES' && <p className="text-sm mt-2">Tap the heart icon on any song to add it here.</p>}
                                    {libraryTab === 'LOCAL' && <p className="text-sm mt-2">Tap "Import" to add files from your device.</p>}
                                    {selectedCollection?.type === 'PLAYLIST' && <p className="text-sm mt-2">This playlist is empty. Add songs from your library.</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {currentView === AppView.AI_CHAT && (
                <AIChatView currentTrack={currentTrack} />
            )}
            {currentView === AppView.SETTINGS && (
                <div className="p-6 animate-slide-up pb-24">
                    <h1 className="text-3xl font-bold mb-6 text-app-text">Settings</h1>
                    <div className="space-y-6">
                        <section className="glass-panel p-4 rounded-xl space-y-4">
                            <h2 className="text-sm text-app-subtext uppercase font-bold tracking-wider mb-2">General</h2>
                            <div className="flex justify-between items-center cursor-pointer hover:bg-app-surface/50 p-2 rounded-lg transition-colors" onClick={toggleTheme}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-brand-dark/20 text-brand-light">{theme === 'dark' ? <Icons.Moon className="w-4 h-4" /> : <Icons.Sun className="w-4 h-4" />}</div>
                                    <span className="text-app-text">Appearance</span>
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} transition-colors`}><span className="text-xs font-bold text-app-text uppercase">{theme}</span></div>
                            </div>
                        </section>

                        <section className="glass-panel p-4 rounded-xl space-y-4">
                            <h2 className="text-sm text-app-subtext uppercase font-bold tracking-wider mb-2">Gesture Controls</h2>
                            {[{ type: GestureType.SWIPE, label: "Swipe Horizontal", icon: <Icons.SkipForward className="w-4 h-4"/> }, { type: GestureType.PINCH, label: "Pinch Scale", icon: <Icons.Maximize2 className="w-4 h-4"/> }, { type: GestureType.CIRCLE, label: "Circular Motion", icon: <Icons.Volume2 className="w-4 h-4"/> }].map((gesture) => (
                                <div key={gesture.type} className="flex justify-between items-center p-2">
                                    <div className="flex items-center gap-3 text-app-text">
                                        <div className="p-2 rounded-full bg-brand-accent/10 text-brand-accent">{gesture.icon}</div>
                                        <span>{gesture.label}</span>
                                    </div>
                                    <select value={gestureSettings[gesture.type]} onChange={(e) => updateGesture(gesture.type, e.target.value as GestureAction)} className="bg-app-bg border border-app-border rounded-lg px-3 py-1.5 text-sm text-app-text focus:ring-1 focus:ring-brand-accent outline-none">
                                        <option value={GestureAction.SEEK}>Seek</option>
                                        <option value={GestureAction.VOLUME}>Volume</option>
                                        <option value={GestureAction.ZOOM}>Zoom</option>
                                        <option value={GestureAction.NONE}>None</option>
                                    </select>
                                </div>
                            ))}
                        </section>

                        <section className="glass-panel p-4 rounded-xl space-y-4">
                             <h2 className="text-sm text-app-subtext uppercase font-bold tracking-wider mb-2">Audio</h2>
                             <div className="flex justify-between items-center p-2"><span className="text-app-text">High Quality Streaming</span><div className="w-10 h-6 bg-brand-accent rounded-full relative cursor-pointer shadow-inner"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div></div></div>
                            <div className="flex justify-between items-center p-2"><span className="text-app-text">Smart Crossfade (AI)</span><div className="w-10 h-6 bg-app-card rounded-full relative cursor-pointer border border-app-border"><div className="absolute left-1 top-1 w-4 h-4 bg-app-subtext rounded-full shadow"></div></div></div>
                        </section>
                    </div>
                </div>
            )}
        </main>

        {currentTrack && currentView !== AppView.PLAYER && (
            <div className="fixed bottom-[4.5rem] md:bottom-0 md:left-20 md:right-0 h-16 bg-app-surface border-t border-app-border flex items-center px-4 z-40 cursor-pointer w-full shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-colors duration-300" onClick={() => setCurrentView(AppView.PLAYER)}>
                <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                    <img src={currentTrack.coverUrl} className="w-full h-full rounded-md object-cover" />
                    {isPlaying && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Icons.Activity className="w-4 h-4 text-white" /></div>}
                </div>
                <div className="flex-1 min-w-0 mr-4"><h4 className="text-sm font-bold truncate text-app-text">{currentTrack.title}</h4><p className="text-xs text-app-subtext truncate">{currentTrack.artist}</p></div>
                <div className="flex items-center gap-3">
                    <button onClick={(e) => toggleFavorite(currentTrack.id, e)} className="hidden sm:block text-app-subtext hover:text-brand-accent p-2"><Icons.Heart className={`w-5 h-5 ${favorites.has(currentTrack.id) ? 'fill-brand-accent text-brand-accent' : ''}`} /></button>
                    <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-10 h-10 rounded-full bg-brand-accent text-white flex items-center justify-center hover:bg-brand-light transition shadow-lg flex-shrink-0">
                        {isPlaying ? <Icons.Pause className="w-5 h-5" /> : <Icons.Play className="w-5 h-5 ml-1" />}
                    </button>
                </div>
                <div className="absolute top-0 left-0 h-[2px] bg-brand-accent" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
            </div>
        )}

        <nav className="fixed bottom-0 left-0 w-full h-[4.5rem] md:w-20 md:h-full md:flex-col bg-app-surface border-t md:border-t-0 md:border-r border-app-border flex items-center justify-around md:justify-center md:gap-10 z-50 transition-colors duration-300">
            <button onClick={() => setCurrentView(AppView.HOME)} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === AppView.HOME ? 'text-brand-accent' : 'text-app-subtext hover:text-app-text'}`}><Icons.Home className="w-6 h-6" /><span className="text-[10px] md:hidden font-medium">Home</span></button>
            <button onClick={() => setCurrentView(AppView.LIBRARY)} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === AppView.LIBRARY ? 'text-brand-accent' : 'text-app-subtext hover:text-app-text'}`}><Icons.Library className="w-6 h-6" /><span className="text-[10px] md:hidden font-medium">Library</span></button>
            
            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-light to-brand-dark text-white shadow-lg">
                <Icons.Play className="w-6 h-6 fill-white" />
            </div>
            
            <button onClick={() => setCurrentView(AppView.AI_CHAT)} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === AppView.AI_CHAT ? 'text-brand-accent' : 'text-app-subtext hover:text-app-text'}`}><Icons.Wand2 className="w-6 h-6" /><span className="text-[10px] md:hidden font-medium">Assistant</span></button>
            <button onClick={() => setCurrentView(AppView.SETTINGS)} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === AppView.SETTINGS ? 'text-brand-accent' : 'text-app-subtext hover:text-app-text'}`}><Icons.Settings className="w-6 h-6" /><span className="text-[10px] md:hidden font-medium">Settings</span></button>
        </nav>

        {currentView === AppView.PLAYER && currentTrack && (
            <PlayerView 
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayPause={togglePlay}
                onNext={() => handleNext(false)}
                onPrev={handlePrev}
                audioElement={audioRef.current}
                onClose={() => setCurrentView(AppView.HOME)}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                isFavorite={favorites.has(currentTrack.id)}
                onToggleFavorite={() => toggleFavorite(currentTrack.id)}
                shuffleOn={shuffleOn}
                repeatMode={repeatMode}
                onToggleShuffle={toggleShuffle}
                onToggleRepeat={toggleRepeat}
                onUpdateDuration={setDuration}
                onUpdateTime={setCurrentTime}
                gestureSettings={gestureSettings}
                eqSettings={eqSettings}
                onUpdateEq={setEqSettings}
                sleepTimerActive={sleepTimer.active}
                onSetSleepTimer={setTimer}
            />
        )}
        </div>
    </div>
  );
};

export default App;
