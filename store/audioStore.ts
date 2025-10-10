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

export const useAudioStore = create<AudioStore>((set) => ({
  currentTrack: null,
  isPlaying: false,
  playbackMode: 'archive',
  setTrack: (track) => set({ currentTrack: track, playbackMode: track.mode }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  clearTrack: () => set({ currentTrack: null, isPlaying: false }),
  setLiveTrack: (liveData) => set({
    currentTrack: {
      id: 'live-stream',
      url: 'https://streaming.radio.co/s3699c5e49/listen',
      title: liveData.title,
      artist: 'Live on Refuge Worldwide',
      artwork: liveData.artwork,
      mode: 'live',
      isLive: true,
    },
    playbackMode: 'live',
  }),
}));
