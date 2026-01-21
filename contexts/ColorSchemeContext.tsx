import { Colors } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type ColorScheme = keyof typeof Colors;

interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  isLoading: boolean;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(
  undefined,
);

interface ColorSchemeProviderProps {
  children: ReactNode;
}

const COLOR_SCHEME_KEY = "@color_scheme";

export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("light");
  const [isLoading, setIsLoading] = useState(true);

  // Load saved color scheme on mount
  useEffect(() => {
    loadColorScheme();
  }, []);

  const loadColorScheme = async () => {
    try {
      const savedScheme = await AsyncStorage.getItem(COLOR_SCHEME_KEY);
      if (savedScheme && savedScheme in Colors) {
        setColorSchemeState(savedScheme as ColorScheme);
      }
    } catch (error) {
      console.error("Error loading color scheme:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    try {
      await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme);
      setColorSchemeState(scheme);
    } catch (error) {
      console.error("Error saving color scheme:", error);
      setColorSchemeState(scheme); // Still update state even if save fails
    }
  };

  return (
    <ColorSchemeContext.Provider
      value={{ colorScheme, setColorScheme, isLoading }}
    >
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error("useColorScheme must be used within a ColorSchemeProvider");
  }
  return context.colorScheme;
}

export function useColorSchemeContext() {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error(
      "useColorSchemeContext must be used within a ColorSchemeProvider",
    );
  }
  return context;
}

export function useSetColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error(
      "useSetColorScheme must be used within a ColorSchemeProvider",
    );
  }
  return context.setColorScheme;
}
