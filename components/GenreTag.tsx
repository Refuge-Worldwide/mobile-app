import { useThemeColor } from "@/hooks/useThemeColor";
import { Pressable, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";

interface GenreTagProps {
  name: string;
  onPress: () => void;
}

export function GenreTag({ name, onPress }: GenreTagProps) {
  const textColor = useThemeColor({}, "text");

  return (
    <Pressable
      style={[styles.genreTag, { borderColor: textColor }]}
      onPress={onPress}
    >
      <ThemedText type="tag">{name}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  genreTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
});
