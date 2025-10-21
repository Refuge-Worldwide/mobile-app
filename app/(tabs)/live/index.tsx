import { Icon } from '@/components/Icon';
import { RefugeLogo } from '@/components/RefugeLogo';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAudioStore } from '@/store/audioStore';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Live() {
  const [liveNow, setLiveNow] = useState<{ title: string; artwork: string, slug: string, isMixedFeelings: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  const { currentTrack, isPlaying, isLoading, setLiveTrack, stopTrack } = useAudioStore();
  const isCurrentlyPlayingLive = currentTrack?.isLive && isPlaying;

  const fetchLiveShow = useCallback(async () => {
    try {
      const res = await fetch('https://refugeworldwide.com/api/schedule');
      const data = await res.json();
      setLiveNow(data.liveNow);
    } catch (error) {
      console.error('Failed to fetch live show:', error);
    }
  }, []);

  // Fetch live show data
  useEffect(() => {
    // Fetch immediately on mount
    fetchLiveShow();

    // Set up interval to fetch every 30 seconds
    const interval = setInterval(fetchLiveShow, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [fetchLiveShow]);

  const playFunction = async () => {
    if (isCurrentlyPlayingLive) {
      // Pause live playback (keeps player open)
      stopTrack();
    } else {
      // Start live playback - or resume if already loaded
      if (liveNow) {
        setLiveTrack({
          title: liveNow.title,
          artwork: liveNow.artwork,
        });
      }
    }
  };

  const openChat = async () => {
    try {
      // Discord app deep link - you can customize this with your specific Discord server/channel
      const discordUrl = 'discord://';
      const discordWebUrl = 'https://discord.com/';

      // Check if Discord app can be opened
      const canOpenDiscord = await Linking.canOpenURL(discordUrl);

      if (canOpenDiscord) {
        // Open Discord app
        await Linking.openURL(discordUrl);
      } else {
        // If Discord app is not installed, offer to open Discord in browser
        Alert.alert(
          'Discord Not Found',
          'Discord app is not installed. Would you like to open Discord in your browser?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Browser',
              onPress: () => Linking.openURL(discordWebUrl)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error opening Discord:', error);
      Alert.alert('Error', 'Unable to open Discord. Please try again.');
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLiveShow();
    setRefreshing(false);
  }, [fetchLiveShow]);

  return (
    <ThemedView style={[styles.liveContainer, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <RefugeLogo size={50} variant="text" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={textColor}
            colors={[textColor]}
          />
        }
      >
        <View style={styles.centeredContent}>
          {liveNow &&
            <View>
              <Pressable onPress={playFunction} style={styles.imageContainer}>
                <Image
                  style={styles.image}
                  contentFit="cover"
                  transition={1000}
                  placeholder="blurhash"
                  source={liveNow?.artwork}
                />
                <View style={styles.playButtonOverlay}>
                  {isLoading ? (
                    <Icon
                      name="loading"
                      size={84}
                      withShadow={true}
                      style={styles.loadingIcon}
                    />
                  ) : (
                    <Icon
                      name={isCurrentlyPlayingLive ? "stop" : "play"}
                      size={84}
                      withShadow={true}
                    />
                  )}
                </View>
              </Pressable>
              <View style={styles.liveNowContainer}>
                <View style={{ backgroundColor: textColor, padding: 4 }}>
                  <ThemedText
                    type="subtitle"
                    style={{ color: backgroundColor }}
                  >
                    Live now
                  </ThemedText>
                </View>
                <View style={{ backgroundColor: textColor, padding: 4 }}>
                  <ThemedText type="subtitle" style={{ color: backgroundColor }}>
                    {liveNow.title}
                  </ThemedText>
                </View>
              </View>
            </View>
          }
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <Pressable
          onPress={openChat}
          style={[styles.menuButton, { backgroundColor: textColor, borderColor: textColor }]}
        >
          <ThemedText type="large" style={{ color: backgroundColor }}>
            Chat
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.menuButton, { backgroundColor: textColor, borderColor: textColor }]}
        >
          <Link href="/live/schedule" style={styles.buttonLink}>
            <ThemedText type="large" style={{ color: backgroundColor }}>
              Schedule
            </ThemedText>
          </Link>
        </Pressable>
      </View>
    </ThemedView >
  );
}

const styles = StyleSheet.create({
  liveContainer: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  centeredContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  image: {
    flex: 1,
    height: undefined,
    width: '100%',
    maxWidth: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  liveNowContainer: {
    gap: 1,
  },
  liveNowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveNowText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  showTitle: {
    textAlign: 'center',
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -12,
  },
  menuButton: {
    paddingHorizontal: 7.5,
    paddingTop: 2,
    paddingBottom: 0,
    marginHorizontal: 3,
    borderWidth: 1,
  },
  buttonLink: {
    textDecorationLine: 'none',
  },
  loadingIcon: {
    opacity: 0.7,
  },
});