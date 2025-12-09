
import React from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Heart, ListMusic, Home, Library, Settings, Mic2, 
  Volume2, VolumeX, Maximize2, Minimize2, Search,
  Wand2, MessageSquare, PlusCircle, Music, Activity,
  Sun, Moon
} from 'lucide-react';

export const Icons = {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Heart, ListMusic, Home, Library, Settings, Mic2,
  Volume2, VolumeX, Maximize2, Minimize2, Search,
  Wand2, MessageSquare, PlusCircle, Music, Activity,
  Sun, Moon
};

export type IconName = keyof typeof Icons;
