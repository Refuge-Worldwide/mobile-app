import { BackButton } from '@/components/BackButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Stack } from 'expo-router';
import { useNavigationContext } from '@/contexts/NavigationContext';

export default function Layout() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const { setTabNavigation } = useNavigationContext();

  return (
    <Stack
      screenOptions={({ navigation }) => {
        // Register this navigation object for the live tab
        setTabNavigation('live', navigation);

        return {
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
        };
      }}>
      <Stack.Screen name="index" options={{ headerShown: false, title: "Live" }} />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="show/[slug]" />
      <Stack.Screen name="artist/[slug]" />
      <Stack.Screen name="genre/[slug]" />
    </Stack>
  );
}