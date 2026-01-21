import { create } from "zustand";

export type PlaybackMode = "archive" | "live";

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
  queue: Track[];
  isPlaying: boolean;
  isLoading: boolean;
  setTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearTrack: () => void;
  stopTrack: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (queue: Track[]) => void;
  clearQueue: () => void;
  playNextFromQueue: () => Track | null;
  setLiveTrack: (liveData: {
    title: string;
    artwork?: string;
    showId?: string;
  }) => void;
  setLiveTrackChannel2: (liveData: {
    title: string;
    artwork?: string;
    showId?: string;
  }) => void;
  updateLiveTrackMetadata: (liveData: {
    title: string;
    artwork?: string;
    showId?: string;
  }) => void;
  isShowPlaying: (showId: string) => boolean;
}

// Optimize image URL for lock screen - square crop for better display
const optimizeImageForPlayer = (
  src: string | undefined,
): string | undefined => {
  if (!src) return undefined;

  const imageUrl = src.startsWith("//") ? `https:${src}` : src;

  if (
    !imageUrl.includes("ctfassets.net") &&
    !imageUrl.includes("contentful.com")
  ) {
    return imageUrl;
  }

  // Square crop for lock screen (500x500 with face detection)
  return `${imageUrl}?w=500&h=500&q=80&fm=jpg&fl=progressive&f=faces&fit=fill`;
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  isLoading: false,
  setTrack: (track) =>
    set({
      currentTrack: {
        ...track,
        artwork: optimizeImageForPlayer(track.artwork),
      },
      isPlaying: true,
      isLoading: true,
    }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearTrack: () =>
    set({ currentTrack: null, isPlaying: false, isLoading: false }),
  stopTrack: () => set({ isPlaying: false }),
  addToQueue: (track) => {
    const state = get();
    const optimizedTrack = {
      ...track,
      artwork: optimizeImageForPlayer(track.artwork),
    };
    set({ queue: [...state.queue, optimizedTrack] });
  },
  removeFromQueue: (index) => {
    const state = get();
    const newQueue = [...state.queue];
    newQueue.splice(index, 1);
    set({ queue: newQueue });
  },
  reorderQueue: (queue) => set({ queue }),
  clearQueue: () => set({ queue: [] }),
  playNextFromQueue: () => {
    const state = get();
    if (state.queue.length === 0) {
      return null;
    }
    // Get the first track from queue
    const [nextTrack, ...remainingQueue] = state.queue;
    // Set it as current track and remove from queue
    set({
      currentTrack: nextTrack,
      queue: remainingQueue,
      isPlaying: true,
      isLoading: true,
    });
    return nextTrack;
  },
  isShowPlaying: (showId: string) => {
    const state = get();
    return state.currentTrack?.showId === showId && state.isPlaying;
  },
  setLiveTrack: (liveData) => {
    const state = get();
    const trackData = {
      id: "live-stream",
      url: "https://streaming.radio.co/s3699c5e49/listen",
      title: liveData.title,
      artist: "Live on Refuge Worldwide",
      artwork: optimizeImageForPlayer(liveData.artwork),
      mode: "live" as PlaybackMode,
      isLive: true,
      showId: liveData.showId,
    };

    // Check if we're already on the live stream
    if (
      state.currentTrack?.isLive &&
      state.currentTrack?.id === "live-stream"
    ) {
      // Update the track metadata and ensure playback starts
      set({ currentTrack: trackData, isPlaying: true });
    } else {
      // New live track - set track and start loading/playing
      set({
        currentTrack: trackData,
        isPlaying: true,
        isLoading: true,
      });
    }
  },
  setLiveTrackChannel2: (liveData) => {
    const state = get();
    const trackData = {
      id: "live-stream-ch2",
      url: "https://s4.radio.co/s8ce53d687/listen",
      title: liveData.title,
      artist: "Live on Refuge Worldwide - Channel 2",
      artwork: optimizeImageForPlayer(liveData.artwork),
      mode: "live" as PlaybackMode,
      isLive: true,
      showId: liveData.showId,
    };

    // Check if we're already on the channel 2 live stream
    if (
      state.currentTrack?.isLive &&
      state.currentTrack?.id === "live-stream-ch2"
    ) {
      // Update the track metadata and ensure playback starts
      set({ currentTrack: trackData, isPlaying: true });
    } else {
      // New live track - set track and start loading/playing
      set({
        currentTrack: trackData,
        isPlaying: true,
        isLoading: true,
      });
    }
  },
  updateLiveTrackMetadata: (liveData) => {
    const state = get();
    if (!state.currentTrack?.isLive) return;

    // Only update metadata, don't touch playback state
    const updatedTrack = {
      ...state.currentTrack,
      title: liveData.title,
      artwork: optimizeImageForPlayer(liveData.artwork),
      showId: liveData.showId,
    };

    set({ currentTrack: updatedTrack });
  },
}));
