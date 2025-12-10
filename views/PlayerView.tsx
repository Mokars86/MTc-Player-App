
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/Icon';
import { MediaItem, RepeatMode, MediaType, GestureSettings, GestureType, GestureAction, EqSettings, PresetName } from '../types';
import AudioEngine from '../components/AudioEngine';
import { translateLyrics } from '../services/geminiService';

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
  gestureSettings?: GestureSettings;
  eqSettings?: EqSettings;
  onUpdateEq?: (settings: EqSettings) => void;
  sleepTimerActive?: boolean;
  onSetSleepTimer?: (minutes: number | null) => void;
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
  onUpdateDuration,
  gestureSettings,
  eqSettings = { preset: 'Flat', gains: { 60: 0, 250: 0, 1000: 0, 4000: 0, 16000: 0 } },
  onUpdateEq,
  sleepTimerActive,
  onSetSleepTimer
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [volume, setVolume] = useState(() => audioElement ? audioElement.volume : 1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  
  // Playback Speed State
  const [playbackRate, setPlaybackRate] = useState(1);

  // Translation State
  const [translatedLyrics, setTranslatedLyrics] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Video Controls State
  const [showVideoControls, setShowVideoControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Gesture State
  const touchRef = useRef<{
    startX: number;
    startY: number;
    startDist: number;
    startAngle: number;
    initialVol: number;
    initialTime: number;
    active: boolean;
  } | null>(null);
  const [gestureFeedback, setGestureFeedback] = useState<{ icon: any; value?: string } | null>(null);
  
  // Sync volume state with global Audio element
  useEffect(() => {
      if (!audioElement) return;
      if (Math.abs(audioElement.volume - volume) > 0.01) {
          setVolume(audioElement.volume);
      }
      const handleVolumeUpdate = () => {
          setVolume(audioElement.volume);
      };
      audioElement.addEventListener('volumechange', handleVolumeUpdate);
      return () => {
          audioElement.removeEventListener('volumechange', handleVolumeUpdate);
      };
  }, [audioElement]);

  useEffect(() => {
    if (currentTrack.type === MediaType.VIDEO && videoRef.current) {
        if (isPlaying && videoRef.current.paused) {
            videoRef.current.play().catch(e => console.warn("Video auto-play interrupted", e));
        } else if (!isPlaying && !videoRef.current.paused) {
            videoRef.current.pause();
        }
        if (Math.abs(videoRef.current.volume - volume) > 0.01) {
             videoRef.current.volume = volume;
        }
    }
  }, [currentTrack.type, isPlaying, volume]);

  // Sync Playback Rate
  useEffect(() => {
    if (audioElement) audioElement.playbackRate = playbackRate;
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioElement]);

  useEffect(() => {
      if (currentTrack.type === MediaType.VIDEO && videoRef.current) {
          if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
              videoRef.current.currentTime = currentTime;
          }
      }
  }, [currentTime, currentTrack.type]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      updateVolume(newVolume);
  };

  const updateVolume = (newVolume: number) => {
      setVolume(newVolume);
      if (audioElement) audioElement.volume = newVolume;
      if (videoRef.current) videoRef.current.volume = newVolume;
  }

  const toggleMute = () => {
      const newVol = volume > 0 ? 0 : 1;
      updateVolume(newVol);
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

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    onSeek(time);
    if(videoRef.current && !isPlaying) {
        videoRef.current.currentTime = time;
    }
  };

  const handleVideoMouseMove = () => {
    setShowVideoControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => setShowVideoControls(false), 3000);
  };

  // --- GESTURES ---
  const getDistance = (t1: React.Touch, t2: React.Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  const getAngle = (t: React.Touch, cx: number, cy: number) => Math.atan2(t.clientY - cy, t.clientX - cx);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!gestureSettings) return;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const rect = e.currentTarget.getBoundingClientRect();
    touchRef.current = {
      startX: t1.clientX,
      startY: t1.clientY,
      startDist: t2 ? getDistance(t1, t2) : 0,
      startAngle: getAngle(t1, rect.left + rect.width / 2, rect.top + rect.height / 2),
      initialVol: volume,
      initialTime: currentTime,
      active: true
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current || !gestureSettings || !touchRef.current.active) return;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const rect = e.currentTarget.getBoundingClientRect();
    const { startX, startY, startDist, startAngle, initialVol, initialTime } = touchRef.current;
    
    let action = GestureAction.NONE;
    let delta = 0;

    if (t2 && startDist > 0) {
        e.preventDefault();
        delta = getDistance(t1, t2) - startDist;
        action = gestureSettings[GestureType.PINCH];
    } else if (!t2) {
        const dx = t1.clientX - startX;
        const angleDelta = getAngle(t1, rect.left + rect.width / 2, rect.top + rect.height / 2) - startAngle;
        if (gestureSettings[GestureType.CIRCLE] !== GestureAction.NONE && Math.abs(angleDelta) > 0.1) {
             e.preventDefault();
             action = gestureSettings[GestureType.CIRCLE];
             delta = angleDelta * 50;
        } else if (gestureSettings[GestureType.SWIPE] !== GestureAction.NONE && Math.abs(dx) > 10) {
             if(Math.abs(dx) > Math.abs(t1.clientY - startY)) e.preventDefault();
             action = gestureSettings[GestureType.SWIPE];
             delta = dx;
        }
    }

    if (action !== GestureAction.NONE && Math.abs(delta) > 5) {
        if (action === GestureAction.VOLUME) {
             const newVol = Math.min(1, Math.max(0, initialVol + (delta * 0.005)));
             updateVolume(newVol);
             setGestureFeedback({ icon: <Icons.Volume2/>, value: `${Math.round(newVol * 100)}%` });
        } else if (action === GestureAction.SEEK) {
             const newTime = Math.min(duration, Math.max(0, initialTime + (delta * 0.2)));
             onSeek(newTime);
             setGestureFeedback({ icon: delta > 0 ? <Icons.SkipForward/> : <Icons.SkipBack/>, value: formatTime(newTime) });
        } else if (action === GestureAction.ZOOM) {
             if (delta > 50 && !isZoomed) setIsZoomed(true);
             if (delta < -50 && isZoomed) setIsZoomed(false);
        }
    }
  };

  const onTouchEnd = () => {
    setGestureFeedback(null);
    if (touchRef.current) touchRef.current.active = false;
  };

  // --- EQ LOGIC ---
  const handleEqChange = (freq: number, val: number) => {
      if (!onUpdateEq) return;
      const newSettings = { ...eqSettings, preset: 'Custom' as PresetName, gains: { ...eqSettings.gains, [freq]: val } };
      onUpdateEq(newSettings);
  };

  const applyPreset = (name: PresetName) => {
      if (!onUpdateEq) return;
      let gains = { 60: 0, 250: 0, 1000: 0, 4000: 0, 16000: 0 };
      if (name === 'Bass Boost') gains = { 60: 8, 250: 5, 1000: 0, 4000: 0, 16000: 2 };
      if (name === 'Vocal') gains = { 60: -2, 250: 2, 1000: 5, 4000: 3, 16000: 1 };
      if (name === 'Treble') gains = { 60: -2, 250: 0, 1000: 2, 4000: 6, 16000: 8 };
      onUpdateEq({ preset: name, gains });
  };

  // --- FEATURES ---
  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2.0, 0.5];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
  };

  const handleTranslate = async () => {
    if (!currentTrack.lyrics) return;
    if (translatedLyrics) {
        setTranslatedLyrics(null); // Toggle off
        return;
    }
    
    setIsTranslating(true);
    const fullText = currentTrack.lyrics.map(l => l.text).join('\n');
    const result = await translateLyrics(fullText);
    setTranslatedLyrics(result);
    setIsTranslating(false);
  };

  const isVideo = currentTrack.type === MediaType.VIDEO;

  return (
    <div 
        className="fixed inset-0 z-50 bg-app-bg flex flex-col animate-slide-up transition-colors duration-300"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
        {/* Gesture Feedback */}
        {gestureFeedback && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center animate-fade-in text-white shadow-2xl">
                    <div className="mb-2 text-brand-accent scale-150">{gestureFeedback.icon}</div>
                    <span className="text-xl font-bold font-mono">{gestureFeedback.value}</span>
                </div>
            </div>
        )}

        {/* Background Blur */}
        {!isVideo && (
            <div className="absolute inset-0 z-0 overflow-hidden">
                <img src={currentTrack.coverUrl} className="w-full h-full object-cover opacity-10 blur-3xl scale-125" alt="bg" />
                <div className="absolute inset-0 bg-gradient-to-b from-app-bg/80 via-app-bg/95 to-app-bg" />
            </div>
        )}

        {/* EQ Modal */}
        {showEq && (
            <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setShowEq(false)}>
                <div className="bg-app-card border border-app-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-app-text flex items-center gap-2"><Icons.Sliders className="w-5 h-5"/> Equalizer</h2>
                        <button onClick={() => setShowEq(false)} className="p-1 hover:bg-app-bg rounded-full text-app-subtext"><Icons.Minimize2/></button>
                    </div>
                    
                    {/* Presets */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 hide-scrollbar">
                        {(['Flat', 'Bass Boost', 'Vocal', 'Treble'] as PresetName[]).map(p => (
                            <button key={p} onClick={() => applyPreset(p)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${eqSettings.preset === p ? 'bg-brand-accent text-white border-brand-accent' : 'bg-app-bg text-app-subtext border-app-border hover:text-app-text'}`}>
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* Sliders */}
                    <div className="flex justify-between h-48 px-2">
                        {[60, 250, 1000, 4000, 16000].map(freq => (
                            <div key={freq} className="flex flex-col items-center gap-2 h-full">
                                <input 
                                    type="range" min="-12" max="12" step="1"
                                    value={eqSettings.gains[freq as keyof typeof eqSettings.gains]}
                                    onChange={(e) => handleEqChange(freq, Number(e.target.value))}
                                    className="h-full w-2 bg-app-bg rounded-full appearance-none cursor-pointer accent-brand-accent vertical-slider"
                                    style={{ writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical' }}
                                />
                                <span className="text-[10px] text-app-subtext font-mono">{freq < 1000 ? freq : freq/1000 + 'k'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Sleep Timer Menu */}
        {showSleepMenu && (
             <div className="absolute top-20 right-6 z-[70] bg-app-card border border-app-border rounded-xl shadow-xl p-2 w-48 animate-fade-in">
                 <div className="text-xs font-bold text-app-subtext uppercase px-3 py-2">Sleep Timer</div>
                 {[15, 30, 60].map(m => (
                     <button key={m} onClick={() => { onSetSleepTimer?.(m); setShowSleepMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-app-text hover:bg-app-bg rounded-lg transition-colors">
                         {m} Minutes
                     </button>
                 ))}
                 <div className="h-px bg-app-border my-1"></div>
                 <button onClick={() => { onSetSleepTimer?.(null); setShowSleepMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-app-bg rounded-lg transition-colors">
                     Turn Off
                 </button>
             </div>
        )}

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
             {/* Header Controls (Close, Menu) */}
             <div className="absolute top-0 left-0 right-0 z-40 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                 <button onClick={onClose} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md">
                     <Icons.Minimize2 className="w-6 h-6" />
                 </button>
                 <div className="flex gap-4">
                     {/* Speed Toggle (Audio Mode) */}
                     {!isVideo && (
                        <button onClick={cyclePlaybackRate} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md flex items-center gap-1">
                            <Icons.Gauge className="w-5 h-5" />
                            <span className="text-xs font-bold w-6">{playbackRate}x</span>
                        </button>
                     )}
                     <button onClick={() => setShowSleepMenu(!showSleepMenu)} className={`p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md ${sleepTimerActive ? 'text-brand-accent' : 'text-white'}`}>
                         <Icons.Timer className="w-6 h-6" />
                     </button>
                     <button onClick={() => setShowEq(!showEq)} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md">
                         <Icons.Sliders className="w-6 h-6" />
                     </button>
                 </div>
             </div>

            {isVideo ? (
                /* VIDEO LAYOUT */
                <div className="flex-1 flex items-center justify-center bg-black relative group" onMouseMove={handleVideoMouseMove} onClick={handleVideoMouseMove}>
                    <video 
                        ref={videoRef}
                        src={currentTrack.mediaUrl}
                        className="w-full h-full object-contain"
                        playsInline
                        loop={repeatMode === RepeatMode.ONE}
                    />
                    
                    {/* Video Overlay Controls */}
                    <div className={`absolute inset-0 bg-black/40 flex flex-col justify-between transition-opacity duration-300 ${showVideoControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                         {/* Top bar handled by main header z-index */}
                         <div className="flex-1 flex items-center justify-center">
                             <button onClick={(e) => { e.stopPropagation(); onPlayPause(); }} className="p-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-transform transform active:scale-95">
                                 {isPlaying ? <Icons.Pause className="w-12 h-12 fill-current" /> : <Icons.Play className="w-12 h-12 fill-current ml-1" />}
                             </button>
                         </div>
                         
                         {/* Video Bottom Bar */}
                         <div className="p-4 bg-gradient-to-t from-black/80 to-transparent space-y-2" onClick={e => e.stopPropagation()}>
                             <input 
                                 type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeekChange}
                                 className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-brand-accent hover:h-2 transition-all"
                             />
                             <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-4 text-white">
                                     <span className="text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                     <button onClick={requestPictureInPicture}><Icons.Maximize2 className="w-5 h-5 hover:text-brand-accent"/></button>
                                     <button onClick={cyclePlaybackRate} className="text-xs font-bold border border-white/30 px-2 py-1 rounded hover:bg-white/10">{playbackRate}x</button>
                                 </div>
                                 <div className="flex items-center gap-4">
                                     <button onClick={onToggleFavorite}><Icons.Heart className={`w-6 h-6 ${isFavorite ? 'fill-brand-accent text-brand-accent' : 'text-white'}`} /></button>
                                     <button onClick={onNext}><Icons.SkipForward className="w-6 h-6 text-white" /></button>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            ) : (
                /* AUDIO LAYOUT */
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                     {/* Artwork / Visualizer */}
                     <div className={`relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 mb-8 ${isZoomed ? 'scale-110 z-20' : ''}`} onClick={() => setIsZoomed(!isZoomed)}>
                          {showLyrics ? (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col p-6 overflow-y-auto text-center scroll-smooth no-scrollbar">
                                   <div className="flex justify-between items-center mb-4 sticky top-0">
                                       <span className="text-xs font-bold text-brand-accent uppercase tracking-wider">Lyrics</span>
                                       <button onClick={(e) => { e.stopPropagation(); handleTranslate(); }} disabled={isTranslating} className="text-xs flex items-center gap-1 bg-white/10 px-2 py-1 rounded hover:bg-white/20 text-white">
                                            <Icons.Languages className="w-3 h-3" />
                                            {isTranslating ? 'Translating...' : translatedLyrics ? 'Original' : 'Translate'}
                                       </button>
                                   </div>
                                   {isTranslating ? (
                                       <div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full"></div></div>
                                   ) : translatedLyrics ? (
                                       <p className="text-lg text-white leading-relaxed whitespace-pre-line font-medium">{translatedLyrics}</p>
                                   ) : (
                                       currentTrack.lyrics ? (
                                          <div className="space-y-6 py-4">
                                              {currentTrack.lyrics.map((line, i) => (
                                                  <p key={i} 
                                                     className={`transition-all duration-300 cursor-pointer hover:text-brand-light ${Math.abs(currentTime - line.time) < 5 ? 'text-brand-accent scale-110 font-bold' : 'text-white/60 text-sm'}`}
                                                     onClick={(e) => { e.stopPropagation(); onSeek(line.time); }}
                                                  >
                                                      {line.text}
                                                  </p>
                                              ))}
                                          </div>
                                       ) : <p className="text-white/50 mt-20">No lyrics available.</p>
                                   )}
                              </div>
                          ) : (
                              <>
                                <img src={currentTrack.coverUrl} className="w-full h-full object-cover" />
                                {/* Audio Engine (Visualizer) Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-0">
                                     <div className="w-full h-full opacity-80">
                                         <AudioEngine audioElement={audioElement} isPlaying={isPlaying} color="#2dd4bf" eqSettings={eqSettings} />
                                     </div>
                                </div>
                              </>
                          )}
                     </div>

                     {/* Track Info */}
                     <div className="w-full max-w-sm mb-2 flex justify-between items-center">
                         <div className="overflow-hidden">
                             <h2 className="text-2xl font-bold text-app-text truncate">{currentTrack.title}</h2>
                             <p className="text-app-subtext truncate">{currentTrack.artist}</p>
                         </div>
                         <button onClick={() => onToggleFavorite?.()} className="p-2 transition-transform active:scale-90">
                             <Icons.Heart className={`w-7 h-7 ${isFavorite ? 'fill-brand-accent text-brand-accent' : 'text-app-subtext'}`} />
                         </button>
                     </div>

                     {/* Progress */}
                     <div className="w-full max-w-sm mb-6 group">
                         <input 
                            type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeekChange}
                            className="w-full h-1.5 bg-app-border rounded-full appearance-none cursor-pointer accent-brand-accent hover:h-2 transition-all"
                         />
                         <div className="flex justify-between text-xs text-app-subtext mt-2 font-mono">
                             <span>{formatTime(currentTime)}</span>
                             <span>{formatTime(duration)}</span>
                         </div>
                     </div>

                     {/* Controls */}
                     <div className="w-full max-w-sm flex items-center justify-between mb-8">
                         <button onClick={onToggleShuffle} className={`p-2 transition-colors ${shuffleOn ? 'text-brand-accent' : 'text-app-subtext'}`}><Icons.Shuffle className="w-5 h-5"/></button>
                         <button onClick={onPrev} className="p-2 text-app-text hover:text-brand-accent transition-colors"><Icons.SkipBack className="w-8 h-8 fill-current"/></button>
                         <button onClick={onPlayPause} className="w-16 h-16 rounded-full bg-brand-accent text-white flex items-center justify-center shadow-[0_0_20px_rgba(13,148,136,0.4)] hover:scale-105 hover:shadow-[0_0_30px_rgba(13,148,136,0.6)] transition-all">
                             {isPlaying ? <Icons.Pause className="w-8 h-8 fill-current" /> : <Icons.Play className="w-8 h-8 fill-current ml-1" />}
                         </button>
                         <button onClick={onNext} className="p-2 text-app-text hover:text-brand-accent transition-colors"><Icons.SkipForward className="w-8 h-8 fill-current"/></button>
                         <button onClick={onToggleRepeat} className={`p-2 transition-colors ${repeatMode !== RepeatMode.OFF ? 'text-brand-accent' : 'text-app-subtext'}`}>
                             {repeatMode === RepeatMode.ONE ? <Icons.Repeat1 className="w-5 h-5"/> : <Icons.Repeat className="w-5 h-5"/>}
                         </button>
                     </div>

                     {/* Bottom Tools */}
                     <div className="w-full max-w-sm flex items-center justify-between px-4">
                         <div className="flex items-center gap-2 group relative">
                             <button onClick={toggleMute} className="text-app-subtext hover:text-app-text"><Icons.Volume2 className="w-5 h-5"/></button>
                             <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="w-20 h-1 bg-app-border rounded-full accent-brand-accent" />
                         </div>
                         <button onClick={() => setShowLyrics(!showLyrics)} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${showLyrics ? 'bg-brand-accent text-white border-brand-accent' : 'border-app-border text-app-subtext hover:text-app-text'}`}>
                             <Icons.MessageSquare className="w-4 h-4" /> Lyrics
                         </button>
                     </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default PlayerView;
