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
  showId?: string; // Unique show ID for matching with show cards
  slug?: string; // Show slug for API fetching
}

interface AudioStore {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  playbackMode: PlaybackMode;
  setTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearTrack: () => void;
  stopTrack: () => void;
  setLiveTrack: (liveData: { title: string; artwork?: string; showId?: string }) => void;
  setLiveTrackChannel2: (liveData: { title: string; artwork?: string; showId?: string }) => void;
  isShowPlaying: (showId: string) => boolean;
}

// Optimize image URL for faster loading (same as ShowCard)
const optimizeImageForPlayer = (src: string | undefined): string | undefined => {
  if (!src) return undefined;

  const imageUrl = src.startsWith('//') ? `https:${src}` : src;

  if (!imageUrl.includes('ctfassets.net') && !imageUrl.includes('contentful.com')) {
    return imageUrl;
  }

  // Same optimization as ShowCard (590x332 with face detection)
  return `${imageUrl}?w=590&h=332&q=80&fm=jpg&fl=progressive&f=faces&fit=fill`;
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  playbackMode: 'archive',
  setTrack: (track) => set({
    currentTrack: {
      ...track,
      artwork: optimizeImageForPlayer(track.artwork),
    },
    playbackMode: track.mode
  }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearTrack: () => set({ currentTrack: null, isPlaying: false, isLoading: false }),
  stopTrack: () => set({ isPlaying: false }),
  isShowPlaying: (showId: string) => {
    const state = get();
    return state.currentTrack?.showId === showId && state.isPlaying;
  },
  setLiveTrack: (liveData) => {
    const state = get();
    // Check if we're already on the live stream
    if (state.currentTrack?.isLive && state.currentTrack?.id === 'live-stream') {
      // Just resume/play the existing track - don't create a new one
      set({ isPlaying: true });
      return;
    }

    // Otherwise set up a new live track
    set({
      currentTrack: {
        id: 'live-stream',
        url: 'https://streaming.radio.co/s3699c5e49/listen',
        title: liveData.title,
        artist: 'Live on Refuge Worldwide',
        artwork: optimizeImageForPlayer(liveData.artwork),
        mode: 'live',
        isLive: true,
        showId: liveData.showId,
      },
      playbackMode: 'live',
    });
  },
  setLiveTrackChannel2: (liveData) => {
    const state = get();
    // Check if we're already on the channel 2 live stream
    if (state.currentTrack?.isLive && state.currentTrack?.id === 'live-stream-ch2') {
      // Just resume/play the existing track - don't create a new one
      set({ isPlaying: true });
      return;
    }

    // Otherwise set up a new live track for channel 2
    set({
      currentTrack: {
        id: 'live-stream-ch2',
        url: 'https://s4.radio.co/s8ce53d687/listen',
        title: liveData.title,
        artist: 'Live on Refuge Worldwide - Channel 2',
        artwork: optimizeImageForPlayer(liveData.artwork),
        mode: 'live',
        isLive: true,
        showId: liveData.showId,
      },
      playbackMode: 'live',
    });
  },
}));
