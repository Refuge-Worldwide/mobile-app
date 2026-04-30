import { renderHook } from '@testing-library/react-native';
import { Colors } from '@/constants/Colors';

// Mock useColorScheme at the module level — defaults to 'light'
const mockColorScheme = { value: 'light' as 'light' | 'dark' };

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme.value,
}));

// Import after mocking
import { useThemeColor } from '@/hooks/useThemeColor';

describe('useThemeColor', () => {
  afterEach(() => {
    mockColorScheme.value = 'light';
  });

  // ─── light mode ────────────────────────────────────────────────────────

  it('returns Colors.light[colorName] in light mode', () => {
    mockColorScheme.value = 'light';
    const { result } = renderHook(() => useThemeColor({}, 'text'));
    expect(result.current).toBe(Colors.light.text);
  });

  it('returns the light prop value when provided, overriding the theme color', () => {
    mockColorScheme.value = 'light';
    const { result } = renderHook(() => useThemeColor({ light: '#custom-light' }, 'text'));
    expect(result.current).toBe('#custom-light');
  });

  it('ignores the dark prop when in light mode', () => {
    mockColorScheme.value = 'light';
    const { result } = renderHook(() => useThemeColor({ dark: '#dark-only' }, 'text'));
    expect(result.current).toBe(Colors.light.text);
  });

  // ─── dark mode ─────────────────────────────────────────────────────────

  it('returns Colors.dark[colorName] in dark mode', () => {
    mockColorScheme.value = 'dark';
    const { result } = renderHook(() => useThemeColor({}, 'text'));
    expect(result.current).toBe(Colors.dark.text);
  });

  it('returns the dark prop value when provided in dark mode', () => {
    mockColorScheme.value = 'dark';
    const { result } = renderHook(() => useThemeColor({ dark: '#custom-dark' }, 'text'));
    expect(result.current).toBe('#custom-dark');
  });

  it('ignores the light prop when in dark mode', () => {
    mockColorScheme.value = 'dark';
    const { result } = renderHook(() => useThemeColor({ light: '#light-only' }, 'text'));
    expect(result.current).toBe(Colors.dark.text);
  });
});
