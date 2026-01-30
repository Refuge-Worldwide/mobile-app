import { BackButton } from '@/components/BackButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Stack } from 'expo-router';

export default function Layout() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: backgroundColor,
        },
        headerTintColor: textColor,
        headerTitle: '',
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: ({ canGoBack }) => {
          if (canGoBack) {
            return <BackButton />;
          }
          return null;
        },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false, title: "Live" }} />
      <Stack.Screen name="chat" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="show/[slug]" />
      <Stack.Screen name="artist/[slug]" />
      <Stack.Screen name="genre/[slug]" />
    </Stack>
  );
}