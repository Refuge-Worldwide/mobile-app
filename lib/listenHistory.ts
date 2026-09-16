import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

const LAST_LIVE_KEY = "rw-last-live-played-at";
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

interface ListenHistoryRow {
  show_id: string;
  slug: string;
  title: string;
  url: string;
  artwork: string | null;
  date: string | null;
  position: number;
  duration: number;
  finished: number;
  updated_at: number;
}

function rowToEntry(row: ListenHistoryRow): ListenHistoryEntry {
  return {
    showId: row.show_id,
    slug: row.slug,
    title: row.title,
    url: row.url,
    artwork: row.artwork ?? undefined,
    date: row.date ?? undefined,
    position: row.position,
    duration: row.duration,
    finished: row.finished === 1,
    updatedAt: row.updated_at,
  };
}

const dbPromise = (async () => {
  const db = await SQLite.openDatabaseAsync("listenHistory.db");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS listen_history (
      show_id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      artwork TEXT,
      date TEXT,
      position REAL NOT NULL,
      duration REAL NOT NULL,
      finished INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS listen_history_updated_at
      ON listen_history (updated_at DESC);
  `);
  return db;
})();

export async function getHistory(): Promise<ListenHistoryEntry[]> {
  try {
    const db = await dbPromise;
    const rows = await db.getAllAsync<ListenHistoryRow>(
      "SELECT * FROM listen_history ORDER BY updated_at DESC",
    );
    return rows.map(rowToEntry);
  } catch {
    return [];
  }
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
  try {
    const db = await dbPromise;
    const row = await db.getFirstAsync<ListenHistoryRow>(
      "SELECT * FROM listen_history ORDER BY updated_at DESC LIMIT 1",
    );
    if (!row || row.finished === 1) return null;

    const lastLiveAt = await getLastLivePlayedAt();
    if (lastLiveAt > row.updated_at) return null;

    return rowToEntry(row);
  } catch {
    return null;
  }
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

  const finished = entry.position / entry.duration >= FINISHED_THRESHOLD;

  try {
    const db = await dbPromise;
    await db.runAsync(
      `INSERT INTO listen_history
        (show_id, slug, title, url, artwork, date, position, duration, finished, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(show_id) DO UPDATE SET
         slug = excluded.slug,
         title = excluded.title,
         url = excluded.url,
         artwork = excluded.artwork,
         date = excluded.date,
         position = excluded.position,
         duration = excluded.duration,
         finished = excluded.finished,
         updated_at = excluded.updated_at`,
      [
        entry.showId,
        entry.slug,
        entry.title,
        entry.url,
        entry.artwork ?? null,
        entry.date ?? null,
        entry.position,
        entry.duration,
        finished ? 1 : 0,
        Date.now(),
      ],
    );
  } catch {}
}
