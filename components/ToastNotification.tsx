import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

type ToastType = 'success' | 'error';

interface ToastData {
  type: ToastType;
  text1: string;
  text2?: string;
  visibilityTime?: number;
}

let showToastFn: ((data: ToastData) => void) | null = null;

export const Toast = {
  show: (data: ToastData) => {
    if (showToastFn) {
      showToastFn(data);
    }
  },
};

export function ToastNotification() {
  const colorScheme = useColorScheme();
  const textColor = Colors[colorScheme ?? 'light'].text;
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    showToastFn = (data: ToastData) => {
      setToast(data);
      const timeout = setTimeout(() => {
        setToast(null);
      }, data.visibilityTime || 3000);

      return () => clearTimeout(timeout);
    };

    return () => {
      showToastFn = null;
    };
  }, []);

  if (!toast) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.container,
        {
          borderColor: textColor,
          backgroundColor: backgroundColor,
        },
      ]}
    >
      <View style={styles.contentContainer}>
        {toast.text1 && (
          <Text
            style={[
              styles.text1,
              { color: textColor },
            ]}
          >
            {toast.text1}
          </Text>
        )}
        {toast.text2 && (
          <Text
            style={[
              styles.text2,
              { color: textColor },
            ]}
            numberOfLines={1}
          >
            {toast.text2}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 180,
    left: '5%',
    right: '5%',
    borderWidth: 1,
    borderRadius: 0,
    height: 60,
    paddingHorizontal: 12,
    justifyContent: 'center',
    zIndex: 9999,
  },
  contentContainer: {
    paddingHorizontal: 12,
  },
  text1: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'VisueltMedium',
  },
  text2: {
    fontSize: 13,
    fontFamily: 'VisueltMedium',
  },
});
