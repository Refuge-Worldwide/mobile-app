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
        // Register this navigation object for the chat tab
        setTabNavigation('chat', navigation);

        return {
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
        };
      }}
    />
  );
}
