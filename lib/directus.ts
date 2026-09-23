import * as SecureStore from 'expo-secure-store';
import { authentication, createDirectus, realtime, rest } from '@directus/sdk';

const TOKEN_KEY = 'directus_access_token';
const REFRESH_KEY = 'directus_refresh_token';
const EXPIRES_AT_KEY = 'directus_expires_at';

const directusUrl = process.env.EXPO_PUBLIC_DIRECTUS_URL;

if (!directusUrl) {
  throw new Error('EXPO_PUBLIC_DIRECTUS_URL is not set');
}

// No authentication composable at all — never attaches a token, so it can't
// be broken by an expired/invalid personal session. Use this for reads that
// are meant to be public regardless of sign-in state (e.g. the chat feed,
// which grants read access to the Public role), so a stale login never
// blocks content that should always be reachable.
export const directusPublic = createDirectus(directusUrl).with(rest());

export const directus = createDirectus(directusUrl)
  .with(
    authentication('json', {
      autoRefresh: true,
      storage: {
        get: async () => {
          const access_token = await SecureStore.getItemAsync(TOKEN_KEY);
          const refresh_token = await SecureStore.getItemAsync(REFRESH_KEY);
          const expires_at_raw = await SecureStore.getItemAsync(EXPIRES_AT_KEY);
          // expires_at must survive app restarts, or the SDK has no way to
          // know a restored token needs refreshing — it just keeps sending
          // the same access token until Directus 401s with "Token expired".
          const expires_at = expires_at_raw ? Number(expires_at_raw) : null;
          return { access_token, refresh_token, expires: null, expires_at };
        },
        set: async (value) => {
          if (value?.access_token) {
            await SecureStore.setItemAsync(TOKEN_KEY, value.access_token);
            if (value.refresh_token) {
              await SecureStore.setItemAsync(REFRESH_KEY, value.refresh_token);
            }
            if (value.expires_at) {
              await SecureStore.setItemAsync(EXPIRES_AT_KEY, String(value.expires_at));
            } else {
              await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
            }
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_KEY);
            await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
          }
        },
      },
    })
  )
  .with(rest())
  .with(realtime());
