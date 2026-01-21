import { useColorScheme } from "@/hooks/useColorScheme";
import { Image } from "expo-image";

interface RefugeLogoProps {
  size?: number;
  variant?: "background" | "text";
}

const logoAssets: Record<string, Record<string, any>> = {
  "dark-background": require("../assets/images/logo-dark-background.png"),
  "dark-text": require("../assets/images/logo-dark-text.png"),
  "grey-background": require("../assets/images/logo-grey-background.png"),
  "grey-text": require("../assets/images/logo-grey-text.png"),
  "light-background": require("../assets/images/logo-light-background.png"),
  "light-text": require("../assets/images/logo-light-text.png"),
  "ochre-background": require("../assets/images/logo-ochre-background.png"),
  "ochre-text": require("../assets/images/logo-ochre-text.png"),
  "olive-background": require("../assets/images/logo-olive-background.png"),
  "olive-text": require("../assets/images/logo-olive-text.png"),
  "pink-background": require("../assets/images/logo-pink-background.png"),
  "pink-text": require("../assets/images/logo-pink-text.png"),
};

export function RefugeLogo({ size = 50, variant = "text" }: RefugeLogoProps) {
  const theme = useColorScheme();
  const logoKey = `${theme}-${variant}`;
  const logoSource = logoAssets[logoKey] || logoAssets["pink-text"];

  return (
    <Image
      source={logoSource}
      style={{ width: size, height: size, resizeMode: "contain" }}
    />
  );
}
