import { Colors } from "@/constants/Colors";
import { useColorSchemeContext } from "@/contexts/ColorSchemeContext";
import { Image, ImageSource } from "expo-image";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

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
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  // Calculate position for logo to move to top left
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const finalLogoSize = 50;
  const logoSize = 200;
  const finalScale = finalLogoSize / logoSize;
  // Move from center to top left (with padding)
  const moveX = -(screenWidth / 2) + 12 + (finalLogoSize / 2);
  const moveY = -(screenHeight / 2) + 60 + (finalLogoSize / 2);

  // Get the correct logo for the current color scheme
  const logoSource = logoImages[colorScheme] || logoImages.light;

  useEffect(() => {
    // Wait for color scheme to be loaded from storage before proceeding
    if (isColorSchemeLoading) return;

    async function prepare() {
      try {
        // Hide native splash now that we have the correct theme
        await ExpoSplashScreen.hideAsync();

        // Pop in the logo with a spring animation
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();

        // Show our custom splash for 3 seconds minimum
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Tell the application to render BEFORE the transition
        // This loads the navigation stack underneath
        onReady();

        // Small delay to let the navigation stack mount
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Now animate the transition over the loaded content
        await new Promise((resolve) => {
          Animated.parallel([
            Animated.timing(translateYAnim, {
              toValue: moveY,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(translateXAnim, {
              toValue: moveX,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: finalScale,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(textFadeAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]).start(() => {
            resolve(null);
          });
        });
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();
  }, [fadeAnim, scaleAnim, translateYAnim, translateXAnim, textFadeAnim, onReady, isColorSchemeLoading, moveX, moveY, finalScale]);

  // Don't render anything visible until we have the correct color scheme
  // The native splash screen will stay visible during this time
  if (isColorSchemeLoading) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.logoContainer}>
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim },
              { translateX: translateXAnim },
              { translateY: translateYAnim },
            ],
          }}
        >
          <Image source={logoSource} style={styles.logo} contentFit="contain" />
        </Animated.View>
      </View>

      <Animated.View
        style={[styles.textContainer, { opacity: textFadeAnim }]}
      >
        <Text style={[styles.text, { color: colors.text }]}>
          supported by members and Carhartt WIP
        </Text>
      </Animated.View>
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
