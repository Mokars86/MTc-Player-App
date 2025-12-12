
import { MediaItem, MediaType } from './types';

export const DEMO_MEDIA: MediaItem[] = [
  {
    id: '1',
    title: 'The Wires',
    artist: 'Kevin MacLeod',
    album: 'Elephants Dream',
    coverUrl: 'https://storage.googleapis.com/media-session/elephants-dream/artwork-512.jpg',
    mediaUrl: 'https://storage.googleapis.com/media-session/elephants-dream/the-wires.mp3',
    type: MediaType.MUSIC,
    duration: 180,
    moods: ['Focus', 'Chill'],
    lyrics: [
      { time: 10, text: "The wires are humming" },
      { time: 15, text: "Electricity flowing" },
      { time: 20, text: "Connecting the world" },
      { time: 25, text: "In a digital dance" }
    ]
  },
  {
    id: 'vid-1',
    title: 'Big Buck Bunny',
    artist: 'Blender Foundation',
    album: 'Open Movie',
    coverUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
    mediaUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: MediaType.VIDEO,
    duration: 596,
    moods: ['Funny', 'Story']
  },
  {
    id: '2',
    title: 'Snow Fight',
    artist: 'Jan Morgenstern',
    album: 'Sintel',
    coverUrl: 'https://storage.googleapis.com/media-session/sintel/artwork-512.jpg',
    mediaUrl: 'https://storage.googleapis.com/media-session/sintel/snow-fight.mp3',
    type: MediaType.MUSIC,
    duration: 205,
    moods: ['Relax', 'Dreamy']
  },
  {
    id: '3',
    title: 'Prelude',
    artist: 'Jan Morgenstern',
    album: 'Big Buck Bunny',
    coverUrl: 'https://storage.googleapis.com/media-session/big-buck-bunny/artwork-512.jpg',
    mediaUrl: 'https://storage.googleapis.com/media-session/big-buck-bunny/prelude.mp3',
    type: MediaType.PODCAST,
    duration: 180,
    moods: ['Happy']
  },
  {
    id: '4',
    title: 'Down',
    artist: 'Marian Call',
    album: 'Elephants Dream',
    coverUrl: 'https://storage.googleapis.com/media-session/elephants-dream/artwork-512.jpg',
    mediaUrl: 'https://storage.googleapis.com/media-session/elephants-dream/down.mp3',
    type: MediaType.MUSIC,
    duration: 212,
    moods: ['Workout', 'Energy']
  }
];

export const MOODS = [
  { label: 'Focus', color: 'bg-blue-600', icon: '🧠' },
  { label: 'Chill', color: 'bg-purple-600', icon: '🧊' },
  { label: 'Workout', color: 'bg-red-600', icon: '💪' },
  { label: 'Happy', color: 'bg-yellow-500', icon: '☀️' },
  { label: 'Sad', color: 'bg-slate-600', icon: '🌧️' },
  { label: 'Party', color: 'bg-pink-600', icon: '🎉' },
];