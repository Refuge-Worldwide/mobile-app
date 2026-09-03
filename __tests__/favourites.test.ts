import {
  addFavourite,
  removeFavourite,
  isFavourited,
  getFavourites,
  toggleFavourite,
} from '@/lib/favourites';
import { directus } from '@/lib/directus';
import { createItem, deleteItems, readItems } from '@directus/sdk';

jest.mock('@/lib/directus', () => ({
  directus: {
    getToken: jest.fn(),
    request: jest.fn(),
  },
}));

jest.mock('@directus/sdk', () => ({
  createItem: jest.fn((collection, item) => ({ __op: 'createItem', collection, item })),
  readItems: jest.fn((collection, query) => ({ __op: 'readItems', collection, query })),
  deleteItems: jest.fn((collection, query) => ({ __op: 'deleteItems', collection, query })),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { backendApiUrl: 'https://api.example.com' } },
}));

const mockGetToken = directus.getToken as jest.Mock;
const mockRequest = directus.request as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── addFavourite ─────────────────────────────────────────────────────────────

describe('addFavourite', () => {
  it('creates an item and returns the result when authenticated', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest.mockResolvedValue({ id: 1, show_id: 'show-abc' });

    const result = await addFavourite('show-abc');
    expect(result.data).toEqual({ id: 1, show_id: 'show-abc' });
    expect(result.error).toBeNull();
    expect(createItem).toHaveBeenCalledWith('show_favourites', { show_id: 'show-abc' });
  });

  it('returns an auth error when not authenticated', async () => {
    mockGetToken.mockResolvedValue(null);

    const result = await addFavourite('show-abc');
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('User not authenticated');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns the error when the request fails', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest.mockRejectedValue(new Error('Request failed'));

    const result = await addFavourite('show-abc');
    expect(result.data).toBeNull();
    expect((result.error as Error).message).toBe('Request failed');
  });
});

// ─── removeFavourite ──────────────────────────────────────────────────────────

describe('removeFavourite', () => {
  it('deletes the record when authenticated', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest.mockResolvedValue(undefined);

    const result = await removeFavourite('show-abc');
    expect(result.error).toBeNull();
    expect(deleteItems).toHaveBeenCalledWith('show_favourites', {
      filter: { show_id: { _eq: 'show-abc' } },
    });
  });

  it('returns an auth error when not authenticated', async () => {
    mockGetToken.mockResolvedValue(null);

    const result = await removeFavourite('show-abc');
    expect(result.error?.message).toBe('User not authenticated');
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

// ─── isFavourited ─────────────────────────────────────────────────────────────

describe('isFavourited', () => {
  it('returns true when the show is in favourites', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest.mockResolvedValue([{ id: 1, show_id: 'show-abc' }]);

    expect(await isFavourited('show-abc')).toBe(true);
  });

  it('returns false when the show is not favourited', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest.mockResolvedValue([]);

    expect(await isFavourited('show-abc')).toBe(false);
  });

  it('returns false when the request errors', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest.mockRejectedValue(new Error('Not found'));

    expect(await isFavourited('show-abc')).toBe(false);
  });

  it('returns false when not authenticated', async () => {
    mockGetToken.mockResolvedValue(null);

    expect(await isFavourited('show-abc')).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

// ─── getFavourites ────────────────────────────────────────────────────────────

describe('getFavourites', () => {
  const mockFavourites = [
    { id: 1, user_created: 'user-123', show_id: 'show-1', date_created: '2024-01-01' },
    { id: 2, user_created: 'user-123', show_id: 'show-2', date_created: '2024-01-02' },
  ];

  it('returns the list of favourites for an authenticated user', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest.mockResolvedValue(mockFavourites);

    const result = await getFavourites();
    expect(result).toHaveLength(2);
    expect(result[0].show_id).toBe('show-1');
    expect(readItems).toHaveBeenCalledWith('show_favourites', { sort: ['-date_created'] });
  });

  it('returns an empty array when not authenticated', async () => {
    mockGetToken.mockResolvedValue(null);

    expect(await getFavourites()).toEqual([]);
  });

  it('returns an empty array when the request errors', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest.mockRejectedValue(new Error('Server error'));

    expect(await getFavourites()).toEqual([]);
  });
});

// ─── toggleFavourite ──────────────────────────────────────────────────────────

describe('toggleFavourite', () => {
  it('creates a favourite when the show is not yet favourited', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest
      .mockResolvedValueOnce([]) // isFavourited lookup
      .mockResolvedValueOnce({ id: 3, show_id: 'show-abc' }); // addFavourite

    const result = await toggleFavourite('show-abc');
    expect(result?.data).toEqual({ id: 3, show_id: 'show-abc' });
    expect(createItem).toHaveBeenCalledWith('show_favourites', { show_id: 'show-abc' });
  });

  it('removes the favourite when the show is already favourited', async () => {
    mockGetToken.mockResolvedValue('token');
    mockRequest
      .mockResolvedValueOnce([{ id: 1, show_id: 'show-abc' }]) // isFavourited lookup
      .mockResolvedValueOnce(undefined); // removeFavourite

    const result = await toggleFavourite('show-abc');
    expect(result?.error).toBeNull();
    expect(deleteItems).toHaveBeenCalledWith('show_favourites', {
      filter: { show_id: { _eq: 'show-abc' } },
    });
  });
});
