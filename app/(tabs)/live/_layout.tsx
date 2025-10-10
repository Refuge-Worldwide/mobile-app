import { BackButton } from '@/components/BackButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: useThemeColor({}, 'background'),
        },
        headerTitle: '',
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerLeft: ({ canGoBack }) => {
          if (canGoBack) {
            return <BackButton />;
          }
          return null;
        },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false, title: "Live" }} />
      <Stack.Screen name="schedule" />
    </Stack>
  );
}