
export enum MediaType {
  MUSIC = 'MUSIC',
  VIDEO = 'VIDEO',
  PODCAST = 'PODCAST',
  AUDIOBOOK = 'AUDIOBOOK'
}

export interface MediaItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  mediaUrl: string; // URL to the actual file (mp3/mp4)
  type: MediaType;
  duration: number; // in seconds
  moods?: string[];
  lyrics?: LyricLine[];
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export enum AppView {
  HOME = 'HOME',
  LIBRARY = 'LIBRARY',
  PLAYER = 'PLAYER', // Full screen player
  SETTINGS = 'SETTINGS',
  AI_CHAT = 'AI_CHAT'
}

export enum PlayerState {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  BUFFERING = 'BUFFERING'
}

export interface PlayQueue {
  items: MediaItem[];
  currentIndex: number;
}

export type Theme = 'light' | 'dark';

export enum RepeatMode {
  OFF = 'OFF',
  ALL = 'ALL',
  ONE = 'ONE'
}

export enum GestureType {
  SWIPE = 'SWIPE',
  PINCH = 'PINCH',
  CIRCLE = 'CIRCLE'
}

export enum GestureAction {
  SEEK = 'SEEK',
  VOLUME = 'VOLUME',
  ZOOM = 'ZOOM',
  NONE = 'NONE'
}

export interface GestureSettings {
  [GestureType.SWIPE]: GestureAction;
  [GestureType.PINCH]: GestureAction;
  [GestureType.CIRCLE]: GestureAction;
}

// Equalizer Types
export type PresetName = 'Flat' | 'Bass Boost' | 'Vocal' | 'Treble' | 'Custom';

export interface EqSettings {
  preset: PresetName;
  gains: {
    60: number;   // Bass
    250: number;  // Low-Mids
    1000: number; // Mids
    4000: number; // High-Mids
    16000: number;// Treble
  };
}

export interface SleepTimer {
  active: boolean;
  endTime: number | null; // Timestamp
  fadeDuration: number; // ms
}
