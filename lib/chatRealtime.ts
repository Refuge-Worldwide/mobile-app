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

export async function createAnonChatRealtimeClient() {
  const token = await fetchRealtimeToken();
  return createDirectus(directusUrl as string)
    .with(realtime({ authMode: 'handshake' }))
    .with(staticToken(token));
}
