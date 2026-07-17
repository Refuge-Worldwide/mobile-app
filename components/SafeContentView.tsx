import { useLayoutStore } from "@/store/layoutStore";
import { ScrollView, ScrollViewProps, View, ViewProps } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

type SafeContentViewProps = (ViewProps | ScrollViewProps) & {
  lightColor?: string;
  darkColor?: string;
  scrollable?: boolean;
};

export function SafeContentView({
  style,
  lightColor,
  darkColor,
  scrollable = false,
  children,
  ...otherProps
}: SafeContentViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );
  const totalBottomPadding = useLayoutStore((s) => s.bottomStackHeight);

  const containerStyle = [{ backgroundColor }, style];
  const contentStyle = { paddingBottom: totalBottomPadding };

  if (scrollable) {
    return (
      <ScrollView
        style={containerStyle}
        contentContainerStyle={contentStyle}
        {...(otherProps as ScrollViewProps)}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[containerStyle, contentStyle]} {...(otherProps as ViewProps)}>
      {children}
    </View>
  );
}
