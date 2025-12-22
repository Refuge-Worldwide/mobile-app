import { ColourPicker } from '@/components/ColourPicker';
import { SplashScreen } from '@/components/SplashScreen';
import { ToastNotification } from '@/components/ToastNotification';
import { AuthProvider } from '@/contexts/AuthContext';
import { ColorSchemeProvider } from '@/contexts/ColorSchemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

function RootLayoutContent() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <View style={styles.container}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>

            {/* Self-contained ColourPicker with fixed button */}
            <ColourPicker />

            <StatusBar style="auto" />
          </View>
        </ThemeProvider>
      </BottomSheetModalProvider>
      <ToastNotification />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    VisueltMedium: require('../assets/fonts/VisueltMedium.otf'),
    ABCArizonaFlare: require('../assets/fonts/ABCArizonaFlare.otf'),
  });
  const [appIsReady, setAppIsReady] = useState(false);

  if (!loaded || !appIsReady) {
    return (
      <ColorSchemeProvider>
        <SplashScreen onReady={() => setAppIsReady(true)} />
      </ColorSchemeProvider>
    );
  }

  return (
    <ColorSchemeProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </ColorSchemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
