import {
  fetchPlaylists,
  fetchPlaylistBySlug,
  getPlaylistDescriptionText,
  ApiPlaylist,
} from '@/lib/playlistsApi';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

const mockPlaylist: ApiPlaylist = {
  id: 'playlist-1',
  title: 'Best of Techno',
  slug: 'best-of-techno',
  description: {
    json: {
      content: [
        {
          nodeType: 'paragraph',
          content: [{ nodeType: 'text', value: 'A great playlist.' }],
        },
      ],
    },
  },
  soundcloudLink: 'https://soundcloud.com/test',
  image: 'https://img.example.com/cover.jpg',
};

describe('getPlaylistDescriptionText', () => {
  it('extracts the first text value from a rich text description', () => {
    expect(getPlaylistDescriptionText(mockPlaylist.description)).toBe('A great playlist.');
  });

  it('returns empty string when description is undefined', () => {
    expect(getPlaylistDescriptionText(undefined)).toBe('');
  });

  it('returns empty string when content is empty', () => {
    expect(getPlaylistDescriptionText({ json: { content: [] } })).toBe('');
  });

  it('skips non-text nodes and returns the first text value', () => {
    const desc: ApiPlaylist['description'] = {
      json: {
        content: [
          {
            nodeType: 'paragraph',
            content: [
              { nodeType: 'hyperlink', value: '' },
              { nodeType: 'text', value: 'Actual text' },
            ],
          },
        ],
      },
    };
    expect(getPlaylistDescriptionText(desc)).toBe('Actual text');
  });

  it('ignores blank/whitespace-only text nodes', () => {
    const desc: ApiPlaylist['description'] = {
      json: {
        content: [
          {
            nodeType: 'paragraph',
            content: [
              { nodeType: 'text', value: '   ' },
              { nodeType: 'text', value: 'Real content' },
            ],
          },
        ],
      },
    };
    expect(getPlaylistDescriptionText(desc)).toBe('Real content');
  });
});

describe('fetchPlaylists', () => {
  it('returns a list of playlists from the API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPlaylist],
    });

    const playlists = await fetchPlaylists();
    expect(playlists).toHaveLength(1);
    expect(playlists[0].id).toBe('playlist-1');
  });

  it('throws when the API response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await expect(fetchPlaylists()).rejects.toThrow('Failed to fetch playlists');
  });
});

describe('fetchPlaylistBySlug', () => {
  it('returns the playlist with shows for a given slug', async () => {
    const response = { ...mockPlaylist, shows: [] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => response,
    });

    const playlist = await fetchPlaylistBySlug('best-of-techno');
    expect(playlist.id).toBe('playlist-1');
    expect(playlist.shows).toEqual([]);
  });

  it('throws when the API response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await expect(fetchPlaylistBySlug('missing')).rejects.toThrow('Failed to fetch playlist');
  });

  it('fetches from the correct URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockPlaylist, shows: [] }),
    });

    await fetchPlaylistBySlug('my-playlist');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/my-playlist')
    );
  });
});
