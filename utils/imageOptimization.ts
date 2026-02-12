/**
 * Centralized image optimization utilities for Contentful images
 * Uses Contentful's Images API with face detection for better cropping
 */

/**
 * Base function to optimize Contentful images
 */
const optimizeContentfulImage = (
  src: string | undefined,
  width: number,
  height: number,
): string | undefined => {
  if (!src) return undefined;

  // Handle protocol-relative URLs
  const imageUrl = src.startsWith("//") ? `https:${src}` : src;

  // Only optimize Contentful images
  if (
    !imageUrl.includes("ctfassets.net") &&
    !imageUrl.includes("contentful.com")
  ) {
    return imageUrl;
  }

  // Apply Contentful image optimization parameters
  // w: width, h: height, q: quality, fm: format, fl: flags, f: focus, fit: resize behavior
  return `${imageUrl}?w=${width}&h=${height}&q=80&fm=jpg&fl=progressive&f=faces&fit=fill`;
};

/**
 * Optimize images for show cards (16:9 aspect ratio)
 * Used in: ShowCard, QueuePreview, GenreShowsList, etc.
 * 800px width provides crisp display on 2x pixel density devices
 */
export const optimizeShowImage = (src: string | undefined): string => {
  const optimized = optimizeContentfulImage(src, 800, 450);
  return optimized || "";
};

/**
 * Optimize images for audio player and lock screen (1:1 aspect ratio)
 * Used in: AudioPlayer, audioStore
 * Square format required for iOS/Android lock screen display
 * 600px provides good quality for lock screens with reasonable file size
 */
export const optimizePlayerImage = (
  src: string | undefined,
): string | undefined => {
  return optimizeContentfulImage(src, 600, 600);
};

/**
 * Optimize images for artist thumbnails (16:9 aspect ratio)
 * Used in: ShowDetail artist thumbnails
 * Small size for thumbnail displays (80px wide)
 */
export const optimizeArtistImage = (src: string | undefined): string => {
  const optimized = optimizeContentfulImage(src, 320, 180);
  return optimized || "";
};

/**
 * Optimize images for artist header/detail page (16:9 aspect ratio)
 * Used in: ArtistDetail full-width header image
 * Same size as show images for full-width display
 */
export const optimizeArtistHeaderImage = optimizeShowImage;

/**
 * Optimize images for live channel displays (16:9 aspect ratio)
 * Used in: live/index.tsx for channel images
 */
export const optimizeLiveImage = optimizeShowImage;

/**
 * Helper function to ensure URLs have https: protocol
 */
export const ensureHttps = (url?: string): string => {
  if (!url) return "";
  return url.startsWith("//") ? `https:${url}` : url;
};
