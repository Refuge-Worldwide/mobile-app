import { useThemeColor } from '@/hooks/useThemeColor';
import { Image } from 'expo-image';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

// Keep the native splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync();

interface SplashScreenProps {
  onReady: () => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function prepare() {
      try {
        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();

        // Wait for 5 seconds to show splash
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Fade out animation
        await new Promise(resolve => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            resolve(null);
          });
        });
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        onReady();
        await ExpoSplashScreen.hideAsync();
      }
    }

    prepare();
  }, [fadeAnim, onReady]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo-pink.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.text, { color: textColor }]}>
          supported by members and Carhartt WIP
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  textContainer: {
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});
