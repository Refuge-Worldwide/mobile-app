import {
  optimizeShowImage,
  optimizePlayerImage,
  optimizeArtistImage,
  ensureHttps,
} from '@/utils/imageOptimization';

const CONTENTFUL_URL = 'https://images.ctfassets.net/abc123/image.jpg';
const PROTOCOL_RELATIVE_URL = '//images.ctfassets.net/abc123/image.jpg';
const NON_CONTENTFUL_URL = 'https://example.com/image.jpg';

describe('optimizeShowImage', () => {
  it('appends Contentful optimization params at 800x450', () => {
    const result = optimizeShowImage(CONTENTFUL_URL);
    expect(result).toBe(
      `${CONTENTFUL_URL}?w=800&h=450&q=80&fm=jpg&fl=progressive&f=faces&fit=fill`
    );
  });

  it('handles protocol-relative Contentful URLs', () => {
    const result = optimizeShowImage(PROTOCOL_RELATIVE_URL);
    expect(result).toContain('https://images.ctfassets.net');
    expect(result).toContain('w=800&h=450');
  });

  it('returns non-Contentful URLs unchanged', () => {
    expect(optimizeShowImage(NON_CONTENTFUL_URL)).toBe(NON_CONTENTFUL_URL);
  });

  it('returns empty string for undefined', () => {
    expect(optimizeShowImage(undefined)).toBe('');
  });
});

describe('optimizePlayerImage', () => {
  it('appends optimization params at 600x600 (square for lock screen)', () => {
    const result = optimizePlayerImage(CONTENTFUL_URL);
    expect(result).toBe(
      `${CONTENTFUL_URL}?w=600&h=600&q=80&fm=jpg&fl=progressive&f=faces&fit=fill`
    );
  });

  it('returns undefined for undefined input', () => {
    expect(optimizePlayerImage(undefined)).toBeUndefined();
  });
});

describe('optimizeArtistImage', () => {
  it('appends optimization params at 320x180 (thumbnail size)', () => {
    const result = optimizeArtistImage(CONTENTFUL_URL);
    expect(result).toBe(
      `${CONTENTFUL_URL}?w=320&h=180&q=80&fm=jpg&fl=progressive&f=faces&fit=fill`
    );
  });

  it('returns empty string for undefined', () => {
    expect(optimizeArtistImage(undefined)).toBe('');
  });
});

describe('ensureHttps', () => {
  it('converts protocol-relative URLs to https', () => {
    expect(ensureHttps('//example.com/img.jpg')).toBe('https://example.com/img.jpg');
  });

  it('leaves https URLs unchanged', () => {
    expect(ensureHttps('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
  });

  it('returns empty string for undefined', () => {
    expect(ensureHttps(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(ensureHttps('')).toBe('');
  });
});
