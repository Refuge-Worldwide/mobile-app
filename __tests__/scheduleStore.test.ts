import { useScheduleStore } from '@/hooks/useStore';

beforeEach(() => {
  global.fetch = jest.fn();
  useScheduleStore.setState({ schedule: null } as any);
});

afterEach(() => {
  jest.resetAllMocks();
});

const mockScheduleData = {
  status: 'online',
  liveNow: {
    title: 'DJ Test',
    artwork: 'https://img.example.com/dj.jpg',
    slug: 'dj-test',
  },
  nextUp: [{ title: 'Next Show' }],
  schedule: [],
  ch2: { status: 'offline', liveNow: '' },
};

describe('fetchSchedule', () => {
  it('fetches schedule data and updates the store', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScheduleData,
    });

    await useScheduleStore.getState().fetchSchedule();

    const state = useScheduleStore.getState();
    expect(state.schedule).toEqual(mockScheduleData);
  });

  it('fetches from the Refuge Worldwide schedule API endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScheduleData,
    });

    await useScheduleStore.getState().fetchSchedule();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://refugeworldwide.com/api/schedule'
    );
  });

  it('leaves schedule as null when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await useScheduleStore.getState().fetchSchedule();

    expect(useScheduleStore.getState().schedule).toBeNull();
  });
});
