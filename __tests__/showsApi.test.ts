import { fetchShowBySlug, fetchShowsByIds } from '@/lib/showsApi';

const mockShow = {
  sys: { id: 'sys-123' },
  title: 'Test Show',
  date: '2024-01-01T00:00:00Z',
  slug: 'test-show',
  mixcloudLink: 'https://mixcloud.com/test',
  coverImage: { url: 'https://images.ctfassets.net/test.jpg' },
  genresCollection: { items: [{ name: 'Techno' }, { name: 'House' }] },
  description: 'A great show',
};

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('fetchShowBySlug', () => {
  it('transforms the API response into a Show object', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ show: mockShow, relatedShows: [] }),
    });

    const show = await fetchShowBySlug('test-show');

    expect(show).not.toBeNull();
    expect(show?.id).toBe('sys-123');
    expect(show?.title).toBe('Test Show');
    expect(show?.slug).toBe('test-show');
    expect(show?.coverImage).toBe('https://images.ctfassets.net/test.jpg');
    expect(show?.artwork).toBe('https://images.ctfassets.net/test.jpg');
    expect(show?.genres).toEqual(['Techno', 'House']);
    expect(show?.relatedShows).toEqual([]);
  });

  it('uses show.id as fallback when sys.id is missing', async () => {
    const showWithoutSys = { ...mockShow, sys: undefined, id: 'fallback-id' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ show: showWithoutSys, relatedShows: [] }),
    });

    const show = await fetchShowBySlug('test-show');
    expect(show?.id).toBe('fallback-id');
  });

  it('returns empty genres array when genresCollection is missing', async () => {
    const showWithoutGenres = { ...mockShow, genresCollection: undefined };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ show: showWithoutGenres, relatedShows: [] }),
    });

    const show = await fetchShowBySlug('test-show');
    expect(show?.genres).toEqual([]);
  });

  it('returns null when the API response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const show = await fetchShowBySlug('missing-show');
    expect(show).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const show = await fetchShowBySlug('broken-slug');
    expect(show).toBeNull();
  });

  it('fetches from the correct endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ show: mockShow, relatedShows: [] }),
    });

    await fetchShowBySlug('my-show');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://refugeworldwide.com/api/shows/my-show'
    );
  });
});

describe('fetchShowsByIds', () => {
  const apiShows = [
    { sys: { id: 'id-1' }, title: 'Show One', date: '2024-01-01T00:00:00Z', slug: 'show-one', coverImage: { url: 'https://img1.jpg' }, genresCollection: { items: [] } },
    { sys: { id: 'id-2' }, title: 'Show Two', date: '2024-02-01T00:00:00Z', slug: 'show-two', coverImage: { url: 'https://img2.jpg' }, genresCollection: { items: [] } },
    { sys: { id: 'id-3' }, title: 'Show Three', date: '2024-03-01T00:00:00Z', slug: 'show-three', coverImage: { url: 'https://img3.jpg' }, genresCollection: { items: [] } },
  ];

  it('returns only the shows matching the requested IDs', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shows: apiShows }),
    });

    const result = await fetchShowsByIds(['id-1', 'id-3']);
    expect(result.size).toBe(2);
    expect(result.has('id-1')).toBe(true);
    expect(result.has('id-3')).toBe(true);
    expect(result.has('id-2')).toBe(false);
  });

  it('returns an empty map when the API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const result = await fetchShowsByIds(['id-1']);
    expect(result.size).toBe(0);
  });

  it('returns an empty map when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const result = await fetchShowsByIds(['id-1']);
    expect(result.size).toBe(0);
  });

  it('transforms show data correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shows: [apiShows[0]] }),
    });

    const result = await fetchShowsByIds(['id-1']);
    const show = result.get('id-1');
    expect(show?.title).toBe('Show One');
    expect(show?.coverImage).toBe('https://img1.jpg');
    expect(show?.relatedShows).toEqual([]);
  });
});
