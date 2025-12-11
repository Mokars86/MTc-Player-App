
import { Playlist, GestureSettings, GestureType, GestureAction } from '../types';

// Simulate network latency (ms) to give a realistic "backend" feel
const NETWORK_DELAY = 600;

// Storage Keys
const KEYS = {
  PLAYLISTS: 'mtc_playlists',
  FAVORITES: 'mtc_favorites',
  GESTURES: 'mtc_gestures'
};

// Default Gestures
const DEFAULT_GESTURES: GestureSettings = {
    [GestureType.SWIPE]: GestureAction.SEEK,
    [GestureType.PINCH]: GestureAction.ZOOM,
    [GestureType.CIRCLE]: GestureAction.VOLUME
};

export interface UserData {
    playlists: Playlist[];
    favorites: string[];
    gestures: GestureSettings;
}

/**
 * API Client
 * 
 * This acts as the bridge between the Frontend and the Backend.
 * Currently, it mocks the backend using localStorage with artificial delays.
 * To integrate a real backend later, simply replace the contents of these functions
 * with `fetch()` calls to your API endpoints.
 */
export const api = {
  
  // GET: Fetch all user data on app load
  fetchUserData: async (): Promise<UserData> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const p = localStorage.getItem(KEYS.PLAYLISTS);
        const f = localStorage.getItem(KEYS.FAVORITES);
        const g = localStorage.getItem(KEYS.GESTURES);

        resolve({
          playlists: p ? JSON.parse(p) : [],
          favorites: f ? JSON.parse(f) : [],
          gestures: g ? JSON.parse(g) : DEFAULT_GESTURES
        });
      }, NETWORK_DELAY * 1.5); // Slightly longer for initial load
    });
  },

  // PUT: Sync Playlists
  syncPlaylists: async (playlists: Playlist[]): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
        resolve();
      }, NETWORK_DELAY);
    });
  },

  // PUT: Sync Favorites
  syncFavorites: async (favorites: string[]): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            localStorage.setItem(KEYS.FAVORITES, JSON.stringify(favorites));
            resolve();
        }, NETWORK_DELAY);
    });
  },

  // PUT: Sync Settings
  syncGestures: async (gestures: GestureSettings): Promise<void> => {
      return new Promise((resolve) => {
          setTimeout(() => {
              localStorage.setItem(KEYS.GESTURES, JSON.stringify(gestures));
              resolve();
          }, NETWORK_DELAY);
      });
  }
};
