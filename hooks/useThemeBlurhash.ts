import { useThemeColor } from "@/hooks/useThemeColor";

export function useThemeBlurhash(): string {
  return useThemeColor({}, "loading");
}
