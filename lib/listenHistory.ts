import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { fetchShowBySlug } from "@/lib/showsApi";
import { useAudioStore } from "@/store/audioStore";
import TrackPlayer from "react-native-track-player";
import { Show } from "@/types/shows";

const LAST_LIVE_KEY = "rw-last-live-played-at";
const FINISHED_THRESHOLD = 0.95;

export interface ListenProgress {
  showId: string;
  slug: string;
  position: number;
  duration: number;
  finished: boolean;
  updatedAt: number;
}

export type ListenHistoryEntry = Show & {
  position: number;
  duration: number;
  finished: boolean;
  updatedAt: number;
};

interface ListenProgressRow {
  show_id: string;
  slug: string;
  position: number;
  duration: number;
  finished: number;
  updated_at: number;
}

function rowToProgress(row: ListenProgressRow): ListenProgress {
  return {
    showId: row.show_id,
    slug: row.slug,
    position: row.position,
    duration: row.duration,
    finished: row.finished === 1,
    updatedAt: row.updated_at,
  };
}

const TABLE_COLUMNS = `
  show_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  position REAL NOT NULL,
  duration REAL NOT NULL,
  finished INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
`;

const dbPromise = (async () => {
  const db = await SQLite.openDatabaseAsync("listenHistory.db");
  await db.execAsync(`CREATE TABLE IF NOT EXISTS listen_history (${TABLE_COLUMNS});`);

  // The first version of this table also had NOT NULL title/url columns,
  // which every insert now violates — rebuild it without them, keeping rows.
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(listen_history)",
  );
  if (columns.some((column) => column.name === "title")) {
    await db.execAsync(`
      BEGIN;
      ALTER TABLE listen_history RENAME TO listen_history_old;
      DROP INDEX IF EXISTS listen_history_updated_at;
      CREATE TABLE listen_history (${TABLE_COLUMNS});
      INSERT INTO listen_history (show_id, slug, position, duration, finished, updated_at)
        SELECT show_id, slug, position, duration, finished, updated_at
        FROM listen_history_old;
      DROP TABLE listen_history_old;
      COMMIT;
    `);
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS listen_history_updated_at
      ON listen_history (updated_at DESC);
  `);
  return db;
})();

export async function getHistory(
  limit: number,
  offset: number,
): Promise<ListenHistoryEntry[]> {
  try {
    const db = await dbPromise;
    const rows = await db.getAllAsync<ListenProgressRow>(
      "SELECT * FROM listen_history ORDER BY updated_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
    );

    const entries = await Promise.all(
      rows.map(async (row) => {
        const progress = rowToProgress(row);
        const show = await fetchShowBySlug(progress.slug);
        return show
          ? {
              ...show,
              position: progress.position,
              duration: progress.duration,
              finished: progress.finished,
              updatedAt: progress.updatedAt,
            }
          : null;
      }),
    );

    return entries.filter((entry): entry is ListenHistoryEntry => entry !== null);
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

export async function getResumableShow(): Promise<{
  show: Show;
  progress: ListenProgress;
} | null> {
  try {
    const db = await dbPromise;
    const row = await db.getFirstAsync<ListenProgressRow>(
      "SELECT * FROM listen_history ORDER BY updated_at DESC LIMIT 1",
    );
    if (!row || row.finished === 1) return null;

    const progress = rowToProgress(row);
    const lastLiveAt = await getLastLivePlayedAt();
    if (lastLiveAt > progress.updatedAt) return null;

    const show = await fetchShowBySlug(progress.slug);
    return show ? { show, progress } : null;
  } catch {
    return null;
  }
}

export async function saveProgress(entry: {
  showId: string;
  slug: string;
  position: number;
  duration: number;
}): Promise<void> {
  if (!entry.showId || !entry.slug || !entry.duration) return;

  const finished = entry.position / entry.duration >= FINISHED_THRESHOLD;

  try {
    const db = await dbPromise;
    await db.runAsync(
      `INSERT INTO listen_history
        (show_id, slug, position, duration, finished, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(show_id) DO UPDATE SET
         slug = excluded.slug,
         position = excluded.position,
         duration = excluded.duration,
         finished = excluded.finished,
         updated_at = excluded.updated_at`,
      [
        entry.showId,
        entry.slug,
        entry.position,
        entry.duration,
        finished ? 1 : 0,
        Date.now(),
      ],
    );
  } catch (error) {
    console.warn("[listenHistory] saveProgress failed:", error);
  }
}

// For moments the 30s progress poll would miss: pause, seek, leaving the app.
export async function saveCurrentProgress(): Promise<void> {
  const track = useAudioStore.getState().currentTrack;
  if (track?.mode !== "archive" || !track.showId || !track.slug) return;
  try {
    const { position, duration } = await TrackPlayer.getProgress();
    await saveProgress({
      showId: track.showId,
      slug: track.slug,
      position,
      duration,
    });
  } catch (error) {
    console.warn("[listenHistory] saveCurrentProgress failed:", error);
  }
}
