import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (e) => {
    const position = await TrackPlayer.getProgress().then(p => p.position);
    await TrackPlayer.seekTo(position + e.interval);
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (e) => {
    const position = await TrackPlayer.getProgress().then(p => p.position);
    await TrackPlayer.seekTo(Math.max(0, position - e.interval));
  });
}
