import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <>
      <Stack.Screen options={{ title: '', headerShown: false }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Sorry, something went wrong
        </ThemedText>
        <ThemedText style={styles.errorText}>
          {pathname || 'Page not found'}
        </ThemedText>
        <Pressable
          style={[styles.homeButton, { backgroundColor: textColor }]}
          onPress={() => router.replace('/(tabs)/live')}
        >
          <ThemedText style={[styles.homeButtonText, { color: backgroundColor }]}>
            Go Home
          </ThemedText>
        </Pressable>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 24,
    textAlign: 'center',
  },
  homeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
