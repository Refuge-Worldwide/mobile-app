import { AudioPlayer } from '@/components/AudioPlayer';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleTabPress = (route: any, index: number) => {
    const isFocused = state.index === index;

    if (!isFocused) {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }
  };

  const renderTab = (route: any, index: number) => {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel ?? options.title ?? route.name;
    const isFocused = state.index === index;

    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => handleTabPress(route, index)}
        style={[
          styles.tab,
          {
            backgroundColor: isFocused ? colors.background : colors.text,
            borderColor: colors.text,
          }
        ]}
      >
        <ThemedText type="large" style={{ color: isFocused ? colors.text : colors.background }}>
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const mainTabs = ['live', 'radio', 'playlist'];
  const secondaryTabs = ['search', 'account'];

  const mainTabRoutes = state.routes.filter((route: any) =>
    mainTabs.includes(route.name)
  );

  const secondaryTabRoutes = state.routes.filter((route: any) =>
    secondaryTabs.includes(route.name)
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Main tabs row - centered with borders */}
      <View style={styles.tabsRow}>
        {mainTabRoutes.map((route: any) => {
          const index = state.routes.findIndex((r: any) => r.key === route.key);
          return renderTab(route, index);
        })}
      </View>

      {/* Secondary tabs row - spread across */}
      <View style={styles.tabsRow}>
        {secondaryTabRoutes.map((route: any) => {
          const index = state.routes.findIndex((r: any) => r.key === route.key);
          return renderTab(route, index);
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <>
      <AudioPlayer />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen
          name="live"
          options={{
            title: 'Live',
          }}
        />
        <Tabs.Screen
          name="radio"
          options={{
            title: 'Archive',
          }}
        />
        <Tabs.Screen
          name="playlist"
          options={{
            title: 'Playlists',
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            href: '/search',
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Account',
            href: '/account',
          }}
        />

        {/* Hide schedule from main app tabs by setting href: null */}
        <Tabs.Screen
          name="index"
          options={{
            href: null
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 34, // Safe area padding
    paddingTop: 6,
    minHeight: 120, // Ensure enough height for both rows
    backgroundColor: '#fff',
    zIndex: 200,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  tab: {
    paddingHorizontal: 7.5,
    paddingTop: 3.37,
    paddingBottom: 2.25,
    marginHorizontal: 3,
    borderWidth: 1,
  },
});
