import { useThemeColor } from '@/hooks/useThemeColor';
import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

export type ThemedInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  containerStyle?: ViewStyle;
};

export const ThemedInput = forwardRef<TextInput, ThemedInputProps>(
  ({ style, lightColor, darkColor, containerStyle, placeholderTextColor, ...rest }, ref) => {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const backgroundColor = useThemeColor({}, 'background');
    const borderColor = color;

    // Use the provided placeholder color or create a semi-transparent version
    const finalPlaceholderColor = placeholderTextColor || `${color}80`;

    const inputStyles = [
      styles.input,
      {
        color,
        borderColor,
        backgroundColor,
      },
      style,
    ];

    return (
      <View style={containerStyle}>
        <TextInput
          ref={ref}
          style={inputStyles}
          placeholderTextColor={finalPlaceholderColor}
          {...rest}
        />
      </View>
    );
  }
);

ThemedInput.displayName = 'ThemedInput';

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderBottomWidth: 1,
    fontSize: 43,
    fontFamily: 'ABCArizonaFlare',
    paddingRight: 40,
    paddingLeft: 0,
  },
});
