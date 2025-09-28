import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, title: "Live" }} />
      <Stack.Screen name="schedule" options={{ title: "Schedule" }} />
    </Stack>
  );
}