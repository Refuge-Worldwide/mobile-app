# Refuge Worldwide

Mobile app for [Refuge Worldwide](https://refugeworldwide.com) — a Berlin-based community radio station.

Built with React Native / Expo.

## Features

- **Live radio** — stream the live broadcast with background audio support and schedule info
- **Archive** — browse and play past shows, filterable by genre and artist
- **Artists** — explore the full artist roster with bios and show history
- **Playlists** — curated staff playlists with full tracklists
- **Search** — find shows, artists, and genres
- **Chat** — live chat during broadcasts
- **Account** — manage your profile and podcast subscriptions

## Building

```bash
npm install

# Start dev server
npx expo start

# Build APK (Android)
eas build --platform android --profile preview --local
```
