import { Colors } from "@/constants/Colors";
import { useColorSchemeContext } from "@/contexts/ColorSchemeContext";
import { Image, ImageSource } from "expo-image";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// Keep the native splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync();

// Map color schemes to their logo images
const logoImages: Record<keyof typeof Colors, ImageSource> = {
  light: require("../assets/images/logo-light-text.png"),
  dark: require("../assets/images/logo-dark-text.png"),
  pink: require("../assets/images/logo-pink-text.png"),
  olive: require("../assets/images/logo-olive-text.png"),
  ochre: require("../assets/images/logo-ochre-text.png"),
  grey: require("../assets/images/logo-grey-text.png"),
};

interface SplashScreenProps {
  onReady: () => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const { colorScheme, isLoading: isColorSchemeLoading } =
    useColorSchemeContext();
  const colors = Colors[colorScheme];
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const hasStarted = useRef(false);

  const logoSource = logoImages[colorScheme] || logoImages.light;

  useEffect(() => {
    if (isColorSchemeLoading) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function prepare() {
      try {
        await ExpoSplashScreen.hideAsync();

        // Pop in the logo
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();

        // Show splash for 3 seconds, then fade everything out together
        await new Promise((resolve) => setTimeout(resolve, 3000));

        await new Promise((resolve) => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => resolve(null));
        });

        onReadyRef.current();
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();
  }, [isColorSchemeLoading, fadeAnim, scaleAnim]);

  if (isColorSchemeLoading) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background, opacity: fadeAnim },
      ]}
    >
      <View style={styles.logoContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Image
            source={logoSource}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.text, { color: colors.text }]}>
          supported by members and Carhartt WIP
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
});
