import * as SecureStore from 'expo-secure-store';
import { authentication, createDirectus, rest } from '@directus/sdk';

const TOKEN_KEY = 'directus_access_token';
const REFRESH_KEY = 'directus_refresh_token';

const directusUrl = process.env.EXPO_PUBLIC_DIRECTUS_URL ?? 'https://cms.radiodopo.it';

export const directus = createDirectus(directusUrl)
  .with(
    authentication('json', {
      autoRefresh: true,
      storage: {
        get: async () => {
          const access_token = await SecureStore.getItemAsync(TOKEN_KEY);
          const refresh_token = await SecureStore.getItemAsync(REFRESH_KEY);
          return { access_token, refresh_token, expires: null, expires_at: null };
        },
        set: async (value) => {
          if (value?.access_token) {
            await SecureStore.setItemAsync(TOKEN_KEY, value.access_token);
            if (value.refresh_token) {
              await SecureStore.setItemAsync(REFRESH_KEY, value.refresh_token);
            }
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_KEY);
          }
        },
      },
    })
  )
  .with(rest());
