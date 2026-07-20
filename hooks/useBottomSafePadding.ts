import { useLayoutStore } from "@/store/layoutStore";

export function useBottomSafePadding() {
  return useLayoutStore((s) => s.bottomStackHeight);
}
