import { useThemeColor } from '@/hooks/useThemeColor';
import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';

export type ThemedButtonProps = PressableProps & {
  lightColor?: string;
  darkColor?: string;
  title: string;
  containerStyle?: ViewStyle;
  loading?: boolean;
  variant?: 'filled' | 'outline';
};

export const ThemedButton = forwardRef<typeof Pressable, ThemedButtonProps>(
  ({ style, lightColor, darkColor, title, containerStyle, loading, variant = 'filled', disabled, ...rest }, ref) => {
    const textColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const backgroundColor = useThemeColor({}, 'background');

    const isFilled = variant === 'filled';
    const isDisabled = disabled || loading;

    const buttonStyles = [
      styles.button,
      {
        backgroundColor: isFilled ? textColor : 'transparent',
        borderColor: textColor,
        opacity: isDisabled ? 0.6 : 1,
      },
      style,
    ];

    return (
      <Pressable
        style={buttonStyles}
        disabled={isDisabled}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={isFilled ? backgroundColor : textColor} />
        ) : (
          <ThemedText type="tag" style={{ color: isFilled ? backgroundColor : textColor }}>
            {title}
          </ThemedText>
        )}
      </Pressable>
    );
  }
);

ThemedButton.displayName = 'ThemedButton';

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
