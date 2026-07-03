import { useAudioStore, type Track } from "@/store/audioStore";
import { optimizePlayerImage } from "@/utils/imageOptimization";
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  TrackType,
} from "react-native-track-player";

// Everything that talks to TrackPlayer lives here, in one place, as a
// singleton independent of any component's mount/render lifecycle - the
// native player is a singleton too, and modeling it as React effects tied to
// a component was the root cause of races between loading, seeking, and
// remote-control commands stepping on each other.
//
// The store's `isPlaying` is the only thing that expresses play/pause
// intent. `reconcilePlayback` is the only function that calls
// TrackPlayer.play()/pause() - every other entry point (loading a track,
// seeking, remote controls) just updates intent or triggers a reconcile.

async function resolveStreamUrl(url: string): Promise<string | null> {
  if (!url.includes("soundcloud.com")) return url;
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/soundcloud-resolve?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) throw new Error(`soundcloud-resolve ${res.status}`);
    const data = await res.json();
    return data.streamUrl || null;
  } catch (error) {
    console.error("Error resolving SoundCloud stream URL:", error);
    return null;
  }
}

let reconcileLock = false;

async function reconcilePlayback() {
  if (reconcileLock) return;
  reconcileLock = true;
  try {
    const { isPlaying: wantsToPlay, currentTrack: track } =
      useAudioStore.getState();
    if (!track) return;

    const state = await TrackPlayer.getState();
    const isStalled = state === State.Paused || state === State.Ready;

    if (wantsToPlay && isStalled) {
      await TrackPlayer.play();
    } else if (!wantsToPlay && state === State.Playing) {
      await TrackPlayer.pause();
    }
  } catch (error) {
    console.error("Error reconciling playback state:", error);
  } finally {
    reconcileLock = false;
  }
}

// Guards against a superseded load (user taps a second track before the
// first finishes resolving/loading) from committing after a newer one.
let activeLoadTrackId: string | null = null;

async function loadTrack(track: Track) {
  const loadId = track.id;
  activeLoadTrackId = loadId;
  const { setIsLoading, setIsPlaying } = useAudioStore.getState();

  try {
    await TrackPlayer.reset();

    const streamUrl = await resolveStreamUrl(track.url);
    if (activeLoadTrackId !== loadId) return;
    if (!streamUrl) {
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    const updateOptionsPromise = track.isLive
      ? TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Stop],
        compactCapabilities: [Capability.Play, Capability.Stop],
        notificationCapabilities: [Capability.Play, Capability.Stop],
      })
      : TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SeekTo,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],
        compactCapabilities: [
          Capability.JumpBackward,
          Capability.Play,
          Capability.Pause,
          Capability.JumpForward,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],
        forwardJumpInterval: 30,
        backwardJumpInterval: 30,
      });

    const addTrackPromise = TrackPlayer.add({
      id: track.id,
      url: streamUrl,
      type: streamUrl.includes(".m3u8") ? TrackType.HLS : TrackType.Default,
      title: track.title,
      artist: track.artist || "Unknown Artist",
      artwork: optimizePlayerImage(track.artwork),
      isLiveStream: track.isLive,
    });

    await Promise.all([updateOptionsPromise, addTrackPromise]);
    if (activeLoadTrackId !== loadId) return;

    // Kick off playback. If it lands on Ready/Paused instead of Playing,
    // the PlaybackState listener below keeps reconciling until it plays.
    await reconcilePlayback();
  } catch (error) {
    console.error("Error loading track:", error);
    if (activeLoadTrackId === loadId) {
      setIsLoading(false);
      setIsPlaying(false);
    }
  }
}

export async function seek(position: number) {
  await TrackPlayer.seekTo(position);
}

let isInitialized = false;

export async function initPlaybackController() {
  if (isInitialized) return;
  isInitialized = true;

  try {
    await TrackPlayer.setupPlayer({
      // Improved buffering for mobile network resilience without being excessive
      minBuffer: 15, // Minimum 15 seconds of buffer
      maxBuffer: 120, // Maximum 2 minutes of buffer for archive content
      playBuffer: 3, // Start playing after 3 seconds of buffer
      backBuffer: 20, // Keep 20 seconds of past audio in buffer for seeking
    });
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
    });
  } catch {
    // Player may already be set up - safe to continue
  }

  // Remote controls only update intent - reconcilePlayback (triggered by the
  // store subscription below) issues the actual command.
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    useAudioStore.getState().setIsPlaying(true);
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    useAudioStore.getState().setIsPlaying(false);
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
    useAudioStore.getState().clearTrack();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    seek(event.position).catch((error) => {
      console.error("Error seeking (remote):", error);
    });
  });

  TrackPlayer.addEventListener(Event.PlaybackState, async () => {
    const state = await TrackPlayer.getState();
    const isBuffering = state === State.Buffering || state === State.Loading;

    if (isBuffering) {
      useAudioStore.getState().setIsLoading(true);
    } else if (state === State.Playing || state === State.Paused) {
      useAudioStore.getState().setIsLoading(false);
    }

    reconcilePlayback();
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    useAudioStore.getState().playNextFromQueue();
  });

  // Single subscription drives loading, resetting, live metadata pushes, and
  // reconciliation from store changes - the one place that reacts to state.
  useAudioStore.subscribe((state, prevState) => {
    const track = state.currentTrack;
    const prevTrack = prevState.currentTrack;

    if (track?.id !== prevTrack?.id) {
      // setTrack() always flips isPlaying too, but a track change already
      // owns reconciliation via loadTrack() below - a second, immediate
      // reconcile call here would race it over the shared lock for no
      // benefit, and could cause the useful (post-load) call to be skipped.
      if (!track) {
        TrackPlayer.reset().catch(() => {});
      } else {
        loadTrack(track);
      }
      return;
    }

    if (
      track?.isLive &&
      (track.title !== prevTrack?.title ||
        track.artwork !== prevTrack?.artwork ||
        track.artist !== prevTrack?.artist)
    ) {
      TrackPlayer.updateNowPlayingMetadata({
        title: track.title,
        artist: track.artist || "Live on Refuge Worldwide",
        artwork: optimizePlayerImage(track.artwork),
      }).catch(() => {});
    }

    if (state.isPlaying !== prevState.isPlaying) {
      reconcilePlayback();
    }
  });
}
