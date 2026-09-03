import { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

export type ShowNavigationPrefix =
  | "/(tabs)/radio"
  | "/(tabs)/search"
  | "/(tabs)/live"
  | "/(tabs)/playlist";

// Anything with at least a slug — a full Show, a related-show entry, a
// playlist item, etc. Kept loose (no index signature, so any concrete Show
// shape is still assignable) since this only ever gets JSON-stringified and
// handed to ShowDetail, not used for logic here.
type ShowLike = { slug: string };

export function showDetailPath(
  navigationPrefix: ShowNavigationPrefix,
  slug: string,
): string {
  // Live tab nests show routes under /show/, the other tabs route directly.
  return navigationPrefix === "/(tabs)/live"
    ? `${navigationPrefix}/show/${slug}`
    : `${navigationPrefix}/${slug}`;
}

/**
 * Navigate to a show's detail screen (ShowDetail), passing along whatever
 * we already know about it (title/image/date/genres/mixcloudLink, ...) so
 * that screen can render instantly instead of blocking on a fresh fetch —
 * see components/ShowDetail.tsx's `cached` param. Use this instead of a
 * plain router.push whenever the show came from a list that already has
 * this data (archive, search, playlists, related shows, ...).
 */
export function pushShowDetail(
  router: Router,
  navigationPrefix: ShowNavigationPrefix,
  show: ShowLike,
) {
  router.push({
    pathname: showDetailPath(navigationPrefix, show.slug),
    params: { cached: JSON.stringify(show) },
  } as any);
}
