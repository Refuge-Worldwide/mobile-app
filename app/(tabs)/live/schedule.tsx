import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
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

  return (
    <ThemedView style={[styles.container]}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
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
});