import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/Icon';
import { MediaItem, RepeatMode, MediaType } from '../types';
import Visualizer from '../components/Visualizer';

interface PlayerViewProps {
  currentTrack: MediaItem;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  audioElement: HTMLAudioElement | null;
  onClose: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  shuffleOn?: boolean;
  repeatMode?: RepeatMode;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
  onUpdateTime?: (time: number) => void;
  onUpdateDuration?: (duration: number) => void;
}

const PlayerView: React.FC<PlayerViewProps> = ({
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  audioElement,
  onClose,
  currentTime,
  duration,
  onSeek,
  isFavorite = false,
  onToggleFavorite,
  shuffleOn = false,
  repeatMode = RepeatMode.OFF,
  onToggleShuffle,
  onToggleRepeat,
  onUpdateTime,
  onUpdateDuration
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Sync volume state from global Audio or default
  useEffect(() => {
      if (audioElement && currentTrack.type !== MediaType.VIDEO) {
          setVolume(audioElement.volume);
      }
  }, [audioElement, currentTrack.type]);

  // Video Synchronization Logic
  useEffect(() => {
    if (currentTrack.type === MediaType.VIDEO && videoRef.current) {
        // Sync Play/Pause
        if (isPlaying && videoRef.current.paused) {
            videoRef.current.play().catch(e => console.warn("Video auto-play interrupted", e));
        } else if (!isPlaying && !videoRef.current.paused) {
            videoRef.current.pause();
        }
        
        // Sync Volume
        videoRef.current.volume = volume;
    }
  }, [currentTrack.type, isPlaying, volume]);

  // Handle seeking specifically for video to avoid loop with onTimeUpdate
  useEffect(() => {
      if (currentTrack.type === MediaType.VIDEO && videoRef.current) {
          // Only seek if the difference is significant (user seek), avoiding jitter
          if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
              videoRef.current.currentTime = currentTime;
          }
      }
  }, [currentTime, currentTrack.type]);


  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (currentTrack.type !== MediaType.VIDEO && audioElement) {
          audioElement.volume = newVolume;
      }
      if (videoRef.current) {
          videoRef.current.volume = newVolume;
      }
  };

  const toggleMute = () => {
      const newVol = volume > 0 ? 0 : 1;
      setVolume(newVol);
      if (currentTrack.type !== MediaType.VIDEO && audioElement) audioElement.volume = newVol;
      if (videoRef.current) videoRef.current.volume = newVol;
  };

  const requestPictureInPicture = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.error("PiP failed", err);
      }
    }
  };

  // Format seconds to mm:ss
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value));
  };

  return (
    <div className="fixed inset-0 z-50 bg-app-bg flex flex-col animate-slide-up transition-colors duration-300">
        {/* Background Blur */}
        <div className="absolute inset-0 z-0 overflow-hidden">
             <img src={currentTrack.coverUrl} className="w-full h-full object-cover opacity-10 blur-3xl scale-125" alt="bg" />
             <div className="absolute inset-0 bg-gradient-to-b from-app-bg/80 via-app-bg/95 to-app-bg" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex justify-between items-center p-6">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-app-text/10">
                <Icons.Minimize2 className="text-app-subtext" />
            </button>
            <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest text-brand-light font-semibold">Now Playing</span>
                <span className="text-[10px] font-bold text-app-subtext mt-1">{currentTrack.type}</span>
            </div>
            <button className="p-2 rounded-full hover:bg-app-text/10">
                <Icons.Settings className="text-app-subtext" />
            </button>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto">
            
            {/* Media Container (Video or Album Art) */}
            <div 
                className={`relative w-full aspect-square md:aspect-video mb-8 transition-all duration-500 ease-out 
                    ${currentTrack.type === MediaType.VIDEO ? 'max-h-[60vh] bg-black' : 'max-w-[18rem] md:max-w-sm aspect-square'}
                    ${isZoomed && currentTrack.type !== MediaType.VIDEO ? 'scale-125 md:scale-150 z-50 shadow-2xl' : ''}
                    rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-app-border bg-app-card ring-1 ring-white/5
                `}
                onClick={() => currentTrack.type !== MediaType.VIDEO && setIsZoomed(!isZoomed)}
            >
                {currentTrack.type === MediaType.VIDEO ? (
                    <>
                        <video 
                            ref={videoRef}
                            src={currentTrack.mediaUrl}
                            className="w-full h-full object-contain"
                            playsInline
                            // Native controls hidden, using custom UI
                            onTimeUpdate={(e) => onUpdateTime && onUpdateTime(e.currentTarget.currentTime)}
                            onLoadedMetadata={(e) => onUpdateDuration && onUpdateDuration(e.currentTarget.duration)}
                            onEnded={onNext}
                        />
                         {/* PiP Button for Video */}
                         <button 
                            onClick={(e) => { e.stopPropagation(); requestPictureInPicture(); }}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg hover:bg-brand-accent transition-colors"
                        >
                            <Icons.Maximize2 className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <img src={currentTrack.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                        {/* Visualizer Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-app-bg to-transparent flex items-end justify-center pb-2 overflow-hidden opacity-90 pointer-events-none">
                            <Visualizer audioElement={audioElement} isPlaying={isPlaying} color="#14b8a6" />
                        </div>
                    </>
                )}
            </div>

            {/* Lyrics View (Overlay) */}
            {showLyrics && (
                <div className="absolute inset-0 bg-app-bg/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-8 text-center space-y-6 overflow-y-auto">
                    <button onClick={() => setShowLyrics(false)} className="absolute top-6 right-6">
                        <Icons.Minimize2 className="text-app-text" />
                    </button>
                    <h3 className="text-brand-accent font-bold mb-4 uppercase tracking-widest">Lyrics</h3>
                    {currentTrack.lyrics ? (
                         currentTrack.lyrics.map((line, i) => (
                             <p 
                                key={i} 
                                className={`text-xl transition-all duration-300 cursor-pointer hover:text-app-text ${Math.abs(currentTime - line.time) < 2 ? 'text-app-text scale-110 font-bold text-glow' : 'text-app-subtext'}`}
                                onClick={() => onSeek(line.time)}
                             >
                                 {line.text}
                             </p>
                         ))
                    ) : (
                        <p className="text-app-subtext">No synced lyrics available for this track.</p>
                    )}
                </div>
            )}

            {/* Meta */}
            <div className="text-center mb-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-app-text truncate px-4">{currentTrack.title}</h2>
                <p className="text-brand-light font-medium text-lg truncate mt-1">{currentTrack.artist}</p>
            </div>

            {/* Progress */}
            <div className="w-full max-w-md px-4 mb-4">
                <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
                <div className="flex justify-between text-xs text-app-subtext mt-2 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full max-w-xs mb-6">
                <button 
                    onClick={onToggleShuffle} 
                    className={`transition ${shuffleOn ? 'text-brand-accent' : 'text-app-subtext hover:text-app-text'}`}
                >
                    <Icons.Shuffle className="w-5 h-5" />
                </button>
                
                <button onClick={onPrev} className="text-app-text hover:text-brand-accent transition transform active:scale-95">
                    <Icons.SkipBack className="w-8 h-8" />
                </button>
                
                <button 
                    onClick={onPlayPause}
                    className="w-16 h-16 rounded-full bg-brand-DEFAULT flex items-center justify-center shadow-[0_0_20px_rgba(13,148,136,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] hover:bg-brand-accent transition transform hover:scale-105 active:scale-95 text-white"
                >
                    {isPlaying ? <Icons.Pause className="w-7 h-7 fill-current" /> : <Icons.Play className="w-7 h-7 fill-current ml-1" />}
                </button>
                
                <button onClick={onNext} className="text-app-text hover:text-brand-accent transition transform active:scale-95">
                    <Icons.SkipForward className="w-8 h-8" />
                </button>
                
                <button 
                    onClick={onToggleRepeat}
                    className={`transition ${repeatMode !== RepeatMode.OFF ? 'text-brand-accent' : 'text-app-subtext hover:text-app-text'}`}
                >
                    {repeatMode === RepeatMode.ONE ? <Icons.Repeat1 className="w-5 h-5" /> : <Icons.Repeat className="w-5 h-5" />}
                </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center w-full max-w-xs px-4 mb-8 gap-3">
                 <button onClick={toggleMute} className="text-app-subtext hover:text-app-text">
                     {volume === 0 ? <Icons.VolumeX className="w-5 h-5" /> : <Icons.Volume2 className="w-5 h-5" />}
                 </button>
                 <input 
                    type="range" 
                    min={0} 
                    max={1} 
                    step={0.01}
                    value={volume} 
                    onChange={handleVolumeChange}
                    className="flex-1 h-1 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-brand-light"
                />
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-around w-full max-w-md px-8">
                <button 
                    onClick={() => setShowLyrics(!showLyrics)}
                    className={`flex flex-col items-center gap-1 ${showLyrics ? 'text-brand-accent' : 'text-app-subtext hover:text-app-text'}`}
                >
                    <Icons.MessageSquare className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Lyrics</span>
                </button>
                <button 
                    onClick={onToggleFavorite}
                    className={`flex flex-col items-center gap-1 transition transform active:scale-90 ${isFavorite ? 'text-brand-accent' : 'text-app-subtext hover:text-red-500'}`}
                >
                    <Icons.Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium">{isFavorite ? 'Liked' : 'Like'}</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-app-subtext hover:text-brand-light transition">
                    <Icons.Wand2 className="w-5 h-5" />
                    <span className="text-[10px] font-medium">AI Mix</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default PlayerView;