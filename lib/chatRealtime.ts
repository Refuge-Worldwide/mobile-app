import { createDirectus, realtime, staticToken } from '@directus/sdk';
import Constants from 'expo-constants';

const directusUrl = process.env.EXPO_PUBLIC_DIRECTUS_URL;
const BACKEND_API_URL =
  Constants.expoConfig?.extra?.backendApiUrl || process.env.EXPO_PUBLIC_API_URL;

if (!directusUrl) {
  throw new Error('EXPO_PUBLIC_DIRECTUS_URL is not set');
}

let tokenPromise: Promise<string> | null = null;

async function fetchRealtimeToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = fetch(`${BACKEND_API_URL}/api/chat/realtime-token`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch realtime token (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (typeof data?.token !== 'string') {
          throw new Error('Realtime token response missing token');
        }
        return data.token as string;
      })
      .catch((error) => {
        tokenPromise = null;
        throw error;
      });
  }
  return tokenPromise;
}

/**
 * Builds a fresh websocket-capable Directus client authenticated as the
 * read-only "Chat Reader" Directus user — used for every visitor, signed in
 * or not, matching the website's approach (see refuge-worldwide's
 * lib/directus/chatRealtime.ts). That user carries only read access to the
 * `chat` collection, so its token is safe to hand to any client. It exists
 * purely because this Directus instance's websocket layer requires every
 * socket to authenticate; there's no fully anonymous realtime mode enabled
 * here, and there's no reason to tie the live feed connection to a signed-in
 * user's own session — sending messages still uses their own identity via
 * the website's /api/chat/send.
 *
 * Callers own the returned client's lifecycle (subscribe/disconnect).
 */
export async function createChatRealtimeClient() {
  const token = await fetchRealtimeToken();
  return createDirectus(directusUrl as string)
    .with(realtime({ authMode: 'handshake' }))
    .with(staticToken(token));
}
