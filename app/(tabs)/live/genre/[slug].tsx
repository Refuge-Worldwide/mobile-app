import { GenreShowsList } from "@/components/GenreShowsList";
import { useLocalSearchParams } from "expo-router";

export default function LiveGenreShows() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  
  if (!slug) return null;
  
  return <GenreShowsList genre={decodeURIComponent(slug)} />;
}
