import { Track } from '@/store/audioStore';

export async function buildPlaylistQueue(
  startIndex: number,
  getMoreShows: (fromIndex: number, count: number) => Promise<Track[]>
): Promise<{
  currentTrack: Track;
  queueTracks: Track[];
}> {
  // Get the current track and next 30 tracks starting from startIndex
  const tracks = await getMoreShows(startIndex, 31); // Get current + next 30

  if (tracks.length === 0) {
    throw new Error('No tracks available');
  }

  const currentTrack = tracks[0];
  const queueTracks = tracks.slice(1, 31); // Next 30 tracks

  // If we got fewer than 31 tracks total, we might be near the end
  // Try to supplement with tracks from the beginning to reach 30 in queue
  if (queueTracks.length < 30) {
    try {
      const tracksFromBeginning = await getMoreShows(0, 30 - queueTracks.length);
      queueTracks.push(...tracksFromBeginning);
    } catch (error) {
      // If we can't get more from beginning, just use what we have
      console.warn('Could not fetch tracks from beginning for looping:', error);
    }
  }

  return {
    currentTrack,
    queueTracks,
  };
}

export async function playFromPlaylistPosition(
  startIndex: number,
  getMoreShows: (fromIndex: number, count: number) => Promise<Track[]>,
  audioStore: {
    setTrack: (track: Track) => void;
    clearQueue: () => void;
    addToQueue: (track: Track) => void;
  }
) {
  try {
    const { currentTrack, queueTracks } = await buildPlaylistQueue(startIndex, getMoreShows);

    // Set the current track
    audioStore.setTrack(currentTrack);

    // Clear existing queue
    audioStore.clearQueue();

    // Add the queue tracks
    queueTracks.forEach(track => audioStore.addToQueue(track));
  } catch (error) {
    console.error('Error playing from playlist position:', error);
    throw error;
  }
}