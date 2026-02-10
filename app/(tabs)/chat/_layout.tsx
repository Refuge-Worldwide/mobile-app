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
        headerShadowVisible: false,
        headerTitle: '',
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerBackVisible: false,
        headerLeft: ({ canGoBack }) => {
          if (canGoBack) {
            return <BackButton />;
          }
          return null;
        },
      }}
    />
  );
}
