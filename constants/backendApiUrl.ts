import Constants from "expo-constants";

/**
 * Base URL for the website's own API/pages that the app talks to directly
 * (auth signup, the supporter checkout handoff, ...) — as opposed to the
 * public content APIs elsewhere in the app, which are hardcoded to
 * production since they're stable and always-deployed.
 *
 * Defaults to production, but can be pointed at a preview deployment via
 * EXPO_PUBLIC_API_URL in .env.local — e.g. while a website branch with
 * supporter-flow changes (like `supporters`) hasn't been merged/deployed
 * to refugeworldwide.com yet.
 */
export const BACKEND_API_URL =
  Constants.expoConfig?.extra?.backendApiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://refugeworldwide.com";
