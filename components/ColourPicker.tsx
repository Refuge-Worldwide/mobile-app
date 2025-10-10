import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ColourPicker() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [currentScheme, setCurrentScheme] = useState<keyof typeof Colors>(colorScheme ?? 'light');

  useEffect(() => {
    setCurrentScheme(colorScheme ?? 'light');
  }, [colorScheme]);

  const handleColorSchemeChange = (scheme: keyof typeof Colors) => {
    setCurrentScheme(scheme);
    // Note: You might need to implement actual theme switching logic
    // depending on how your useColorScheme hook works
  };

  // Get all color schemes from the Colors object
  const colorSchemes = Object.entries(Colors).map(([key, colors]) => ({
    key: key as keyof typeof Colors,
    colors,
  }));

  return (
    <View style={[styles.container, { top: insets.top + 10, right: 16 }]}>
      {colorSchemes.map((scheme, index) => (
        <Pressable
          key={scheme.key}
          style={[
            styles.colorButton,
            { backgroundColor: scheme.colors.background },
          ]}
          onPress={() => handleColorSchemeChange(scheme.key)}
        >
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorButton: {
    width: 18,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

