import { Colors } from '@/constants/Colors';
import { useColorScheme, useSetColorScheme } from '@/hooks/useColorScheme';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ColourPicker() {
  const colorScheme = useColorScheme();
  const setColorScheme = useSetColorScheme();
  const insets = useSafeAreaInsets();

  const handleColorSchemeChange = (scheme: keyof typeof Colors) => {
    setColorScheme(scheme);
  };

  // Get all color schemes from the Colors object
  const colorSchemes = Object.entries(Colors).map(([key, colors]) => ({
    key: key as keyof typeof Colors,
    colors,
  }));

  return (
    <View style={[styles.container, { top: insets.top + 10, right: 16 }]}>
      {colorSchemes.map((scheme) => (
        <Pressable
          key={scheme.key}
          style={[
            styles.colorButton,
            { backgroundColor: scheme.colors.background }
          ]}
          onPress={() => handleColorSchemeChange(scheme.key)}
        >
          {colorScheme === scheme.key && (
            <View style={[styles.activeDot, { backgroundColor: scheme.colors.text }]} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorButton: {
    width: 18,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
