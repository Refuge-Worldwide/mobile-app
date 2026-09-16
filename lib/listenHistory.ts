import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "rw-listen-history";
const LAST_LIVE_KEY = "rw-last-live-played-at";
const MAX_ENTRIES = 200;
const FINISHED_THRESHOLD = 0.95;

export interface ListenHistoryEntry {
  showId: string;
  slug: string;
  title: string;
  url: string;
  artwork?: string;
  date?: string;
  position: number;
  duration: number;
  finished: boolean;
  updatedAt: number;
}

async function readHistory(): Promise<ListenHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHistory(entries: ListenHistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {}
}

export async function getHistory(): Promise<ListenHistoryEntry[]> {
  return readHistory();
}

export async function markLivePlayed(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_LIVE_KEY, String(Date.now()));
  } catch {}
}

async function getLastLivePlayedAt(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_LIVE_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export async function getResumableShow(): Promise<ListenHistoryEntry | null> {
  const [lastPlayed] = await readHistory();
  if (!lastPlayed || lastPlayed.finished) return null;

  const lastLiveAt = await getLastLivePlayedAt();
  if (lastLiveAt > lastPlayed.updatedAt) return null;

  return lastPlayed;
}

export async function saveProgress(entry: {
  showId: string;
  slug: string;
  title: string;
  url: string;
  artwork?: string;
  date?: string;
  position: number;
  duration: number;
}): Promise<void> {
  if (!entry.showId || !entry.duration || !entry.url) return;

  const history = await readHistory();
  const finished = entry.position / entry.duration >= FINISHED_THRESHOLD;
  const updated: ListenHistoryEntry = {
    showId: entry.showId,
    slug: entry.slug,
    title: entry.title,
    url: entry.url,
    artwork: entry.artwork,
    date: entry.date,
    position: entry.position,
    duration: entry.duration,
    finished,
    updatedAt: Date.now(),
  };

  const withoutThisShow = history.filter((e) => e.showId !== entry.showId);
  const next = [updated, ...withoutThisShow].slice(0, MAX_ENTRIES);
  await writeHistory(next);
}
