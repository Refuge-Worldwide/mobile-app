import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Text } from '@react-navigation/elements';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
// import TrackPlayer from 'react-native-track-player';

export default function Live() {
  const [liveNow, setLiveNow] = useState<{ title: string; artwork: string, slug: string, isMixedFeelings: boolean } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
    fetchLiveShow();
  }, []);

  const playFunction = async () => {
    if (isPlaying) {
      // await TrackPlayer.stop();
      player.pause();
      setIsPlaying(false);
      return;
    } else {
      try {
        // await TrackPlayer.add({
        //   id: 'live-stream',
        //   url: 'https://streaming.radio.co/s3699c5e49/listen',
        //   title: 'Live Radio',
        //   artist: 'Refuge Worldwide'
        // });
        // await TrackPlayer.play();
        player.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing stream:', error);
      }
    }
  };

  const openChat = () => {
    // Logic to open chat interface
  }

  return (
    <ThemedView style={styles.liveContainer}>
      {liveNow &&
        <Pressable onPress={playFunction}>
          <Text>{isPlaying ? 'Pause' : 'Play'}</Text>
          <Image
            style={styles.image}
            contentFit="cover"
            transition={1000}
            placeholder="blurhash"
            source={liveNow?.artwork}
          />
          <Text>
            Live now
          </Text>
          <Text>
            {liveNow.title}
          </Text>
        </Pressable>
      }

      <Link href="/live/schedule">
        Schedule
      </Link>
      <Pressable onPress={openChat}>
        <ThemedText>Chat</ThemedText>
      </Pressable>
    </ThemedView >
  );
}

const styles = StyleSheet.create({
  liveContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  image: {
    flex: 1,
    height: '50%',
    width: '100%',
  },
});