import { Redirect, useLocalSearchParams } from "expo-router";

export default function RadioDeepLink() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <Redirect href={`/(tabs)/radio/${slug}`} />;
}
