import { create } from 'zustand';

export type PlaybackMode = 'archive' | 'live';

export interface Track {
  id: string;
  url: string;
  title: string;
  artist?: string;
  artwork?: string;
  mode: PlaybackMode;
  isLive?: boolean;
}

interface AudioStore {
  currentTrack: Track | null;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  setTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  clearTrack: () => void;
  setLiveTrack: (liveData: { title: string; artwork?: string }) => void;
}

// Optimize image URL for faster loading (small size for player)
const optimizeImageForPlayer = (src: string | undefined): string | undefined => {
  if (!src) return undefined;

  const imageUrl = src.startsWith('//') ? `https:${src}` : src;

  if (!imageUrl.includes('ctfassets.net') && !imageUrl.includes('contentful.com')) {
    return imageUrl;
  }

  // Smaller size for audio player (150x150)
  return `${imageUrl}?w=150&h=150&q=80&fm=jpg&fl=progressive&fit=fill`;
};

export const useAudioStore = create<AudioStore>((set) => ({
  currentTrack: null,
  isPlaying: false,
  playbackMode: 'archive',
  setTrack: (track) => set({
    currentTrack: {
      ...track,
      artwork: optimizeImageForPlayer(track.artwork),
    },
    playbackMode: track.mode
  }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  clearTrack: () => set({ currentTrack: null, isPlaying: false }),
  setLiveTrack: (liveData) => set({
    currentTrack: {
      id: 'live-stream',
      url: 'https://streaming.radio.co/s3699c5e49/listen',
      title: liveData.title,
      artist: 'Live on Refuge Worldwide',
      artwork: optimizeImageForPlayer(liveData.artwork),
      mode: 'live',
      isLive: true,
    },
    playbackMode: 'live',
  }),
}));
