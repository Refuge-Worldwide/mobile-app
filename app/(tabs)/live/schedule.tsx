import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Artist {
  name: string;
  slug: string;
}

interface CoverImage {
  sys: {
    id: string;
  };
  url: string;
}

interface ScheduleItem {
  title: string;
  date: string;
  dateEnd: string;
  slug: string;
  artistsCollection: {
    items: Artist[];
  };
  coverImage?: CoverImage;
}

interface LiveNow {
  title: string;
  artwork: string;
  link: string | null;
  slug: string | null;
  isMixedFeelings: boolean;
}

interface ScheduleData {
  status: string;
  liveNow: LiveNow;
  nextUp: ScheduleItem[];
  schedule: ScheduleItem[];
  ch2?: {
    status: string;
    liveNow: string;
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

export default function Schedule() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://refugeworldwide.com/api/schedule');
      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }
      const data = await response.json();
      setScheduleData(data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const getUserTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    const today = new Date();

    const isToday = date.toDateString() === today.toDateString();

    const timeFormat = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });    // Format date
    const dateFormat = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    return {
      time: timeFormat.format(date),
      date: isToday ? 'Today' : dateFormat.format(date),
      isToday,
    };
  };

  const isShowLive = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  };

  const groupScheduleByDate = (schedule: ScheduleItem[]) => {
    const grouped: { [key: string]: ScheduleItem[] } = {};

    schedule.forEach(item => {
      const dateKey = new Date(item.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });

    return grouped;
  }; if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={textColor} />
          <ThemedText style={styles.loadingText}>Loading schedule...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Oops!</ThemedText>
          <ThemedText>{error}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const groupedSchedule = scheduleData?.schedule ? groupScheduleByDate(scheduleData.schedule) : {};
  const isEmpty = !scheduleData?.schedule || scheduleData.schedule.length === 0;

  return (
    <ThemedView style={[styles.container]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={isEmpty ? styles.scrollContentEmpty : undefined}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={{ textAlign: 'center' }}>We are updating the schedule,{"\n"} please check back soon.</ThemedText>
          </View>
        ) : (
          <View>
            {Object.entries(groupedSchedule).map(([dateKey, items]) => {
              const firstItem = items[0];
              const { date } = formatDateTime(firstItem.date);

              return (
                <View key={dateKey}>
                  <View style={[styles.dateHeader, { backgroundColor: textColor }]}>
                    <ThemedText
                      style={[styles.dateText, { color: backgroundColor }]}
                    >
                      {date}
                    </ThemedText>
                  </View>

                  {items.map((item) => {
                    const { time } = formatDateTime(item.date);
                    const live = isShowLive(item.date, item.dateEnd);

                    const titleParts = item.title.split(' — ');
                    const showName = titleParts[0]?.trim() || item.title;
                    const artist = titleParts[1]?.trim() || '';

                    return (
                      <View
                        key={item.slug}
                        style={[
                          styles.scheduleItem,
                          { borderBottomColor: textColor }
                        ]}
                      >
                        <View style={styles.timeContainer}>
                          <ThemedText>
                            {time}
                          </ThemedText>
                        </View>
                        <View style={styles.showInfo}>
                          <ThemedText>
                            {showName}
                          </ThemedText>
                          {artist && (
                            <ThemedText>
                              {artist}
                            </ThemedText>
                          )}
                        </View>
                        <View style={styles.liveIndicatorContainer}>
                          {live && <PulsingDot color={textColor} />}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
        {!isEmpty && (
          <View style={styles.timezoneContainer}>
            <ThemedText style={styles.timezoneText}>Displayed in your timezone: {getUserTimezone()}</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentEmpty: {
    flexGrow: 1,
  },
  timezoneContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
    alignItems: 'center',
  },
  timezoneText: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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