import { Icon } from '@/components/Icon';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import TrackPlayer from 'react-native-track-player';

export default function Live() {
  const [liveNow, setLiveNow] = useState<{ title: string; artwork: string, slug: string, isMixedFeelings: boolean } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  // Create a new player each time - this will reload the stream
  const player = useAudioPlayer('https://streaming.radio.co/s3699c5e49/listen');


  // Setup TrackPlayer on mount
  // useEffect(() => {
  //   const setup = async () => {
  //     try {
  //       await TrackPlayer.setupPlayer();
  //     } catch (error) {
  //       console.error('TrackPlayer setup error:', error);
  //     }
  //   };
  //   setup();
  // }, []);

  // Fetch live show data
  useEffect(() => {
    const fetchLiveShow = async () => {
      try {
        const res = await fetch('https://refugeworldwide.com/api/schedule');
        const data = await res.json();
        // Assuming the API returns an array of shows with a "live" property
        setLiveNow(data.liveNow);
      } catch (error) {
        console.error('Failed to fetch live show:', error);
      }
    };

    // Fetch immediately on mount
    fetchLiveShow();

    // Set up interval to fetch every 30 seconds
    const interval = setInterval(fetchLiveShow, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const playFunction = async () => {
    if (isPlaying) {
      // Stop current playback
      setIsLoading(true);
      try {
        player.pause();
        setIsPlaying(false);
      } catch (error) {
        console.error('Error pausing stream:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    } else {
      try {
        setIsLoading(true);

        // The player is recreated on each component render, which reloads the stream
        await player.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing stream:', error);
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
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
  }

  return (
    <ThemedView style={[styles.liveContainer, { paddingTop: insets.top + 20 }]}>
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
                    name={isPlaying ? "stop" : "play"}
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

      <View style={styles.buttons}>
        <Pressable
          onPress={openChat}
          style={[styles.menuButton, { backgroundColor: backgroundColor, borderColor: textColor }]}
        >
          <ThemedText type="large" style={{ color: textColor }}>
            Chat
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.menuButton, { backgroundColor: backgroundColor, borderColor: textColor }]}
        >
          <Link href="/live/schedule" style={styles.buttonLink}>
            <ThemedText type="large" style={{ color: textColor }}>
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
  centeredContent: {
    flex: 1,
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
    paddingTop: 3.37,
    paddingBottom: 2.25,
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