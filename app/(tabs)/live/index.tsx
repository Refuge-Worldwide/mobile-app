import { Icon } from '@/components/Icon';
import { RefugeLogo } from '@/components/RefugeLogo';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAudioStore } from '@/store/audioStore';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Live() {
  const [liveNow, setLiveNow] = useState<{ title: string; artwork: string, slug: string, isMixedFeelings: boolean } | null>(null);
  const [liveNowCh2, setLiveNowCh2] = useState<{ title: string; status: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const screenHeight = Dimensions.get('window').height;

  const { currentTrack, isPlaying, isLoading, setLiveTrack, setLiveTrackChannel2, stopTrack } = useAudioStore();
  const isCurrentlyPlayingLive = currentTrack?.isLive && currentTrack?.id === 'live-stream' && isPlaying;
  const isCurrentlyPlayingLiveCh2 = currentTrack?.isLive && currentTrack?.id === 'live-stream-ch2' && isPlaying;

  const fetchLiveShow = useCallback(async () => {
    try {
      const res = await fetch('https://refugeworldwide.com/api/schedule');
      const data = await res.json();
      setLiveNow(data.liveNow);
      // Set Channel 2 data if available
      if (data.ch2) {
        setLiveNowCh2({
          title: data.ch2.liveNow,
          status: data.ch2.status
        });
      }
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
          showId: liveNow.slug || 'live-stream',
        });
      }
    }
  };

  const playFunctionCh2 = async () => {
    if (isCurrentlyPlayingLiveCh2) {
      // Pause channel 2 live playback (keeps player open)
      stopTrack();
    } else {
      // Start channel 2 live playback - or resume if already loaded
      if (liveNowCh2) {
        setLiveTrackChannel2({
          title: liveNowCh2.title,
          artwork: liveNow?.artwork, // Use Channel 1 artwork as fallback since Ch2 doesn't have artwork
          showId: 'live-stream-ch2',
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

  const isBothChannelsLive = liveNow && liveNowCh2 && liveNowCh2.status === 'online';

  // Calculate responsive padding for single channel to center content
  // Account for: header (~66px), player (~84px at bottom: 120), buttons (~40px), safe areas
  const FIXED_ELEMENTS_HEIGHT = 66 + 120 + 40; // header + player position + buttons
  const AVAILABLE_HEIGHT = screenHeight - insets.top - insets.bottom - FIXED_ELEMENTS_HEIGHT;
  const singleChannelPaddingTop = AVAILABLE_HEIGHT * 0.15; // Use 15% of available height for top padding

  return (
    <ThemedView style={[styles.liveContainer, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <RefugeLogo size={50} variant="text" />
      </View>

      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={[
          styles.scrollContent,
          !isBothChannelsLive && { paddingTop: singleChannelPaddingTop }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={textColor}
            colors={[textColor]}
          />
        }
      >
        <View style={[styles.channelsContainer, { gap: 30 }]}>
          {/* Channel 1 */}
          {liveNow &&
            <View style={styles.channelSection}>
              <Pressable onPress={playFunction} style={styles.imageContainer}>
                <Image
                  style={styles.image}
                  contentFit="cover"
                  transition={1000}
                  placeholder="blurhash"
                  source={liveNow?.artwork}
                />
                <View style={styles.playButtonOverlay}>
                  {isLoading && currentTrack?.id === 'live-stream' && !isCurrentlyPlayingLive ? (
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

          {/* Channel 2 */}
          {liveNowCh2 && liveNowCh2.status === 'online' &&
            <View style={styles.channelSection}>
              <Pressable onPress={playFunctionCh2} style={styles.imageContainer}>
                <Image
                  style={styles.image}
                  contentFit="cover"
                  transition={1000}
                  placeholder="blurhash"
                  source={liveNow?.artwork} // Use Channel 1 artwork as fallback
                />
                <View style={styles.playButtonOverlay}>
                  {isLoading && currentTrack?.id === 'live-stream-ch2' && !isCurrentlyPlayingLiveCh2 ? (
                    <Icon
                      name="loading"
                      size={84}
                      withShadow={true}
                      style={styles.loadingIcon}
                    />
                  ) : (
                    <Icon
                      name={isCurrentlyPlayingLiveCh2 ? "stop" : "play"}
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
                    {liveNowCh2.title}
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
  scrollViewContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    paddingBottom: 180,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  channelsContainer: {
    alignItems: 'center',
  },
  channelSection: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 1,
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