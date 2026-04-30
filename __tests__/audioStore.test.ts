import { useAudioStore, Track } from '@/store/audioStore';

const makeTrack = (overrides?: Partial<Track>): Track => ({
  id: 'show-1',
  url: 'https://example.com/audio.mp3',
  title: 'Test Show',
  artist: 'Test Artist',
  artwork: 'https://example.com/artwork.jpg',
  mode: 'archive',
  showId: 'show-1',
  ...overrides,
});

beforeEach(() => {
  useAudioStore.setState({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    isLoading: false,
  });
});

describe('initial state', () => {
  it('has no track, empty queue, not playing', () => {
    const state = useAudioStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.isPlaying).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('setTrack', () => {
  it('sets the current track and starts loading/playing', () => {
    const track = makeTrack();
    useAudioStore.getState().setTrack(track);
    const state = useAudioStore.getState();
    expect(state.currentTrack).toEqual(track);
    expect(state.isPlaying).toBe(true);
    expect(state.isLoading).toBe(true);
  });
});

describe('clearTrack', () => {
  it('clears the track and stops playback', () => {
    useAudioStore.getState().setTrack(makeTrack());
    useAudioStore.getState().clearTrack();
    const state = useAudioStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('stopTrack', () => {
  it('stops playback without clearing the track', () => {
    const track = makeTrack();
    useAudioStore.getState().setTrack(track);
    useAudioStore.getState().stopTrack();
    const state = useAudioStore.getState();
    expect(state.currentTrack).toEqual(track);
    expect(state.isPlaying).toBe(false);
  });
});

describe('queue management', () => {
  it('addToQueue appends a track', () => {
    const track = makeTrack();
    useAudioStore.getState().addToQueue(track);
    expect(useAudioStore.getState().queue).toHaveLength(1);
    expect(useAudioStore.getState().queue[0]).toEqual(track);
  });

  it('addToQueue preserves existing tracks', () => {
    const track1 = makeTrack({ id: 'a', showId: 'a' });
    const track2 = makeTrack({ id: 'b', showId: 'b' });
    useAudioStore.getState().addToQueue(track1);
    useAudioStore.getState().addToQueue(track2);
    expect(useAudioStore.getState().queue).toHaveLength(2);
  });

  it('removeFromQueue removes track at given index', () => {
    const track1 = makeTrack({ id: 'a', showId: 'a' });
    const track2 = makeTrack({ id: 'b', showId: 'b' });
    useAudioStore.setState({ queue: [track1, track2] });
    useAudioStore.getState().removeFromQueue(0);
    expect(useAudioStore.getState().queue).toHaveLength(1);
    expect(useAudioStore.getState().queue[0].id).toBe('b');
  });

  it('reorderQueue replaces the queue', () => {
    const track1 = makeTrack({ id: 'a', showId: 'a' });
    const track2 = makeTrack({ id: 'b', showId: 'b' });
    useAudioStore.setState({ queue: [track1, track2] });
    useAudioStore.getState().reorderQueue([track2, track1]);
    expect(useAudioStore.getState().queue[0].id).toBe('b');
    expect(useAudioStore.getState().queue[1].id).toBe('a');
  });

  it('clearQueue empties the queue', () => {
    useAudioStore.setState({ queue: [makeTrack()] });
    useAudioStore.getState().clearQueue();
    expect(useAudioStore.getState().queue).toEqual([]);
  });
});

describe('playNextFromQueue', () => {
  it('returns null when queue is empty', () => {
    const next = useAudioStore.getState().playNextFromQueue();
    expect(next).toBeNull();
  });

  it('dequeues the first track and sets it as current', () => {
    const track1 = makeTrack({ id: 'a', showId: 'a' });
    const track2 = makeTrack({ id: 'b', showId: 'b' });
    useAudioStore.setState({ queue: [track1, track2] });
    const next = useAudioStore.getState().playNextFromQueue();
    const state = useAudioStore.getState();
    expect(next?.id).toBe('a');
    expect(state.currentTrack?.id).toBe('a');
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0].id).toBe('b');
    expect(state.isPlaying).toBe(true);
    expect(state.isLoading).toBe(true);
  });
});

describe('isShowPlaying', () => {
  it('returns true when the matching show is playing', () => {
    useAudioStore.setState({
      currentTrack: makeTrack({ showId: 'show-abc' }),
      isPlaying: true,
    });
    expect(useAudioStore.getState().isShowPlaying('show-abc')).toBe(true);
  });

  it('returns false when a different show is playing', () => {
    useAudioStore.setState({
      currentTrack: makeTrack({ showId: 'show-abc' }),
      isPlaying: true,
    });
    expect(useAudioStore.getState().isShowPlaying('show-xyz')).toBe(false);
  });

  it('returns false when the correct show is paused', () => {
    useAudioStore.setState({
      currentTrack: makeTrack({ showId: 'show-abc' }),
      isPlaying: false,
    });
    expect(useAudioStore.getState().isShowPlaying('show-abc')).toBe(false);
  });

  it('returns false when no track is loaded', () => {
    expect(useAudioStore.getState().isShowPlaying('show-abc')).toBe(false);
  });
});

describe('setLiveTrack', () => {
  it('sets a live stream track with the correct URL and metadata', () => {
    useAudioStore.getState().setLiveTrack({ title: 'DJ Name', artwork: 'https://img.jpg', showId: 'live-1', slug: 'dj-name' });
    const state = useAudioStore.getState();
    expect(state.currentTrack?.id).toBe('live-stream');
    expect(state.currentTrack?.isLive).toBe(true);
    expect(state.currentTrack?.title).toBe('DJ Name');
    expect(state.currentTrack?.url).toContain('streaming.radio.co');
    expect(state.isPlaying).toBe(true);
  });

  it('updates metadata without triggering reload when already on live stream', () => {
    useAudioStore.setState({
      currentTrack: makeTrack({ id: 'live-stream', isLive: true, mode: 'live' }),
      isPlaying: true,
      isLoading: false,
    });
    useAudioStore.getState().setLiveTrack({ title: 'New DJ', artwork: 'https://new.jpg' });
    expect(useAudioStore.getState().isLoading).toBe(false);
    expect(useAudioStore.getState().currentTrack?.title).toBe('New DJ');
  });
});

describe('updateLiveTrackMetadata', () => {
  it('updates title and artwork without changing playback state', () => {
    useAudioStore.setState({
      currentTrack: makeTrack({ id: 'live-stream', isLive: true, mode: 'live', title: 'Old Title' }),
      isPlaying: true,
      isLoading: false,
    });
    useAudioStore.getState().updateLiveTrackMetadata({ title: 'New Title', artwork: 'https://new.jpg' });
    const state = useAudioStore.getState();
    expect(state.currentTrack?.title).toBe('New Title');
    expect(state.isPlaying).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('does nothing when current track is not live', () => {
    useAudioStore.setState({
      currentTrack: makeTrack({ isLive: false, title: 'Archive Show' }),
    });
    useAudioStore.getState().updateLiveTrackMetadata({ title: 'Should Not Change' });
    expect(useAudioStore.getState().currentTrack?.title).toBe('Archive Show');
  });
});
