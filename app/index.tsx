// Starting screen for the app.
// Redirects to the live tab when the app starts.
// Allows schedule page to be inside the stack of the live (index) tab.

import { Redirect } from "expo-router";

export default function HomeScreen() {
  return (
    <Redirect href="/(tabs)/live" />
  );
}

