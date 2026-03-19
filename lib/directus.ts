import AsyncStorage from '@react-native-async-storage/async-storage';
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
          const access_token = await AsyncStorage.getItem(TOKEN_KEY);
          const refresh_token = await AsyncStorage.getItem(REFRESH_KEY);
          return { access_token, refresh_token };
        },
        set: async (value) => {
          if (value?.access_token) {
            await AsyncStorage.setItem(TOKEN_KEY, value.access_token);
            if (value.refresh_token) {
              await AsyncStorage.setItem(REFRESH_KEY, value.refresh_token);
            }
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
            await AsyncStorage.removeItem(REFRESH_KEY);
          }
        },
      },
    })
  )
  .with(rest());
