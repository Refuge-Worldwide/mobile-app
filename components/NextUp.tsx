import { useThemeColor } from "@/hooks/useThemeColor";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";

interface NextUpShow {
  title: string;
  date: string;
  dateEnd: string;
  slug: string;
  coverImage?: {
    url: string;
  };
  artistsCollection: {
    items: {
      name: string;
      slug: string;
    }[];
  };
}

function PulsingDot({ color }: { color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.liveDot,
        { backgroundColor: color, opacity: pulseAnim }
      ]}
    />
  );
}

export function NextUp() {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const router = useRouter();
  const [shows, setShows] = useState<NextUpShow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNextUp = useCallback(async () => {
    try {
      const res = await fetch("https://refugeworldwide.com/api/schedule");
      const data = await res.json();
      setShows(data.nextUp || []);
    } catch (error) {
      console.error("Failed to fetch next up shows:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextUp();
  }, [fetchNextUp]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  };

  const isShowLive = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  };

  const groupShowsByDate = (shows: NextUpShow[]) => {
    const grouped: { [key: string]: NextUpShow[] } = {};
    shows.forEach(show => {
      const dateKey = new Date(show.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(show);
    });
    return grouped;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={textColor} />
      </View>
    );
  }

  const groupedShows = groupShowsByDate(shows);

  return (
    <View style={styles.container}>
      {Object.entries(groupedShows).map(([dateKey, dateShows]) => {
        const firstShow = dateShows[0];
        const date = formatDate(firstShow.date);

        return (
          <View key={dateKey}>

            {dateShows.map((show, index) => {
              const time = formatTime(show.date);
              const live = isShowLive(show.date, show.dateEnd);

              const titleParts = show.title.split(' — ');
              const showName = titleParts[0]?.trim() || show.title;
              const artist = titleParts[1]?.trim() || '';

              return (
                <Pressable
                  key={`${show.slug}-${index}`}
                  onPress={() => router.push(`/live/show/${show.slug}` as any)}
                  style={[styles.scheduleItem, { borderBottomColor: textColor }]}
                >
                  <View style={styles.timeContainer}>
                    <ThemedText>{time}</ThemedText>
                  </View>
                  <View style={styles.showInfo}>
                    <ThemedText>{showName}</ThemedText>
                    {artist && <ThemedText>{artist}</ThemedText>}
                  </View>
                  <View style={styles.liveIndicatorContainer}>
                    {live && <PulsingDot color={textColor} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  dateHeader: {
    alignItems: 'center',
  },
  dateText: {
    fontWeight: 'bold',
  },
  scheduleItem: {
    borderBottomWidth: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    flexDirection: 'row',
  },
  timeContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingRight: 12,
  },
  showInfo: {
    flex: 5,
  },
  liveIndicatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 99,
  },
});
