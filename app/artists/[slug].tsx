import { Redirect, useLocalSearchParams } from "expo-router";

export default function ArtistDeepLink() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <Redirect href={`/(tabs)/radio/artist/${slug}`} />;
}
