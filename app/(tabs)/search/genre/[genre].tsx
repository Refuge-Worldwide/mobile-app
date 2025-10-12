import { GenreShowsList } from '@/components/GenreShowsList';
import { useLocalSearchParams } from 'expo-router';

export default function GenrePage() {
  const params = useLocalSearchParams<{ genre: string }>();
  const genreParam = Array.isArray(params.genre) ? params.genre[0] : params.genre;
  const genre = genreParam ? decodeURIComponent(genreParam) : '';

  return <GenreShowsList genre={genre} />;
}
