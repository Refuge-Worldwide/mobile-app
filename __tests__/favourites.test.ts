import {
  addFavourite,
  removeFavourite,
  isFavourited,
  getFavourites,
  toggleFavourite,
} from '@/lib/favourites';
import { supabase } from '@/lib/supabase';

// Self-contained factory — no references to out-of-scope variables
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { backendApiUrl: 'https://api.example.com' } },
}));

// Typed helpers for casting
const mockFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

// Builds a chainable Supabase query builder stub that resolves with `result` at
// the chain terminal (single / order).
function makeChain(result: object) {
  const chain: Record<string, jest.Mock> = {};
  // Each method gets its own jest.fn() so mockReturnValueOnce on one
  // doesn't accidentally consume setups meant for another.
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.delete = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue(result);
  chain.order = jest.fn().mockResolvedValue(result);
  return chain;
}

const mockUser = { id: 'user-123' };

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── addFavourite ─────────────────────────────────────────────────────────────

describe('addFavourite', () => {
  it('inserts a record and returns the result when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const chain = makeChain({ data: { id: 'fav-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await addFavourite('show-abc');
    expect(result.data).toEqual({ id: 'fav-1' });
    expect(result.error).toBeNull();
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      show_id: 'show-abc',
    });
  });

  it('returns an auth error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await addFavourite('show-abc');
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('User not authenticated');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── removeFavourite ──────────────────────────────────────────────────────────

describe('removeFavourite', () => {
  it('deletes the record when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const chain = makeChain({ error: null });
    // Override eq so the second call resolves instead of returning chain
    chain.eq
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValue(chain);

    const result = await removeFavourite('show-abc');
    expect(result.error).toBeNull();
    expect(chain.delete).toHaveBeenCalled();
  });

  it('returns an auth error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await removeFavourite('show-abc');
    expect(result.error?.message).toBe('User not authenticated');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── isFavourited ─────────────────────────────────────────────────────────────

describe('isFavourited', () => {
  it('returns true when the show is in favourites', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockFrom.mockReturnValue(makeChain({ data: { id: 'fav-1' }, error: null }));

    expect(await isFavourited('show-abc')).toBe(true);
  });

  it('returns false when the show is not favourited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    expect(await isFavourited('show-abc')).toBe(false);
  });

  it('returns false when the query errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: new Error('Not found') }));

    expect(await isFavourited('show-abc')).toBe(false);
  });

  it('returns false when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    expect(await isFavourited('show-abc')).toBe(false);
  });
});

// ─── getFavourites ────────────────────────────────────────────────────────────

describe('getFavourites', () => {
  const mockFavourites = [
    { id: 'fav-1', user_id: 'user-123', show_id: 'show-1', created_at: '2024-01-01' },
    { id: 'fav-2', user_id: 'user-123', show_id: 'show-2', created_at: '2024-01-02' },
  ];

  it('returns the list of favourites for an authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockFrom.mockReturnValue(makeChain({ data: mockFavourites, error: null }));

    const result = await getFavourites();
    expect(result).toHaveLength(2);
    expect(result[0].show_id).toBe('show-1');
  });

  it('returns an empty array when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    expect(await getFavourites()).toEqual([]);
  });

  it('returns an empty array when the query errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: new Error('DB error') }));

    expect(await getFavourites()).toEqual([]);
  });
});

// ─── toggleFavourite ──────────────────────────────────────────────────────────

describe('toggleFavourite', () => {
  it('calls addFavourite when the show is not yet favourited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    // First from() call: isFavourited → single returns null
    const isFavChain = makeChain({ data: null, error: null });
    // Second from() call: addFavourite → single returns new record
    const addChain = makeChain({ data: { id: 'fav-new' }, error: null });
    mockFrom
      .mockReturnValueOnce(isFavChain)
      .mockReturnValueOnce(addChain);

    const result = await toggleFavourite('show-abc');
    expect(result?.data).toEqual({ id: 'fav-new' });
    expect(addChain.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      show_id: 'show-abc',
    });
  });

  it('calls removeFavourite when the show is already favourited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    // First from() call: isFavourited → single returns existing record
    const isFavChain = makeChain({ data: { id: 'fav-1' }, error: null });
    // Second from() call: removeFavourite → chain with delete
    const removeChain = makeChain({ error: null });
    removeChain.eq
      .mockReturnValueOnce(removeChain)
      .mockResolvedValueOnce({ error: null });
    mockFrom
      .mockReturnValueOnce(isFavChain)
      .mockReturnValueOnce(removeChain);

    const result = await toggleFavourite('show-abc');
    expect(result?.error).toBeNull();
    expect(removeChain.delete).toHaveBeenCalled();
  });
});
