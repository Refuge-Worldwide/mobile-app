import { create } from "zustand";

const DEFAULT_BOTTOM_STACK_HEIGHT = 82 + 11;

interface LayoutStore {
  bottomStackHeight: number;
  setBottomStackHeight: (height: number) => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  bottomStackHeight: DEFAULT_BOTTOM_STACK_HEIGHT,
  setBottomStackHeight: (height) => set({ bottomStackHeight: height }),
}));
