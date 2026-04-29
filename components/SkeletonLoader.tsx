import { useThemeColor } from "@/hooks/useThemeColor";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = "100%", height = 20, borderRadius = 4, style }: SkeletonProps) {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: textColor,
          opacity,
        },
        style,
      ]}
    />
  );
}

const ShowCardSkeletonComponent = () => {
  const textColor = useThemeColor({}, "text");

  return (
    <View>
      <View style={styles.imageContainer}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
      </View>

      <View style={[styles.infoRow, { borderBottomColor: textColor }]}>
        <Skeleton width="100%" height={20} />
      </View>

      <View style={[styles.genresContainer, { justifyContent: "space-between" }]}>
        <Skeleton width={60} height={20} borderRadius={10} />
        <Skeleton width={80} height={20} borderRadius={10} />
        <Skeleton width={45} height={20} borderRadius={10} />
      </View>
    </View>
  );
};

export const ShowCardSkeleton = React.memo(ShowCardSkeletonComponent);

export function LivePlayerSkeleton() {
  return (
    <View style={styles.livePlayerContainer}>
      <Skeleton width={80} height={60} borderRadius={4} />
      <View style={styles.livePlayerInfo}>
        <Skeleton width="60%" height={18} />
        <View style={styles.livePlayerMeta}>
          <Skeleton width={60} height={14} />
          <Skeleton width={40} height={14} />
        </View>
      </View>
    </View>
  );
}

export function PlaylistCardSkeleton() {
  return (
    <View style={styles.playlistCardContainer}>
      {/* Playlist image */}
      <View style={styles.playlistImageContainer}>
        <Skeleton width="100%" height={200} borderRadius={0} />
        {/* Play button skeleton */}
        <View style={styles.playButtonSkeleton}>
          <Skeleton width={40} height={40} borderRadius={0} />
        </View>
      </View>
      {/* Playlist title */}
      <Skeleton width="70%" height={16} style={{ marginTop: 4, marginBottom: 4 }} />
    </View>
  );
}

export function ShowDetailSkeleton() {
  return (
    <View style={styles.showDetailContainer}>
      {/* Header image */}
      <View style={[styles.imageContainer, { marginHorizontal: 12 }]}>
        <Skeleton width="100%" height={200} borderRadius={0} />
      </View>

      {/* Title and meta */}
      <View style={styles.showDetailContent}>
        <Skeleton width="90%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={16} style={{ marginBottom: 16 }} />

        {/* Genre tags */}
        <View style={styles.genresContainer}>
          <Skeleton width={70} height={24} borderRadius={12} />
          <Skeleton width={90} height={24} borderRadius={12} />
          <Skeleton width={55} height={24} borderRadius={12} />
        </View>

        {/* Description */}
        <View style={{ marginTop: 24 }}>
          <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="85%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={16} />
        </View>

        {/* Related shows */}
        <View style={{ marginTop: 32 }}>
          <Skeleton width="40%" height={20} style={{ marginBottom: 16 }} />
          <ShowCardSkeleton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    marginTop: 0,
    borderBottomWidth: 1,
  },
  dateBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 4,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  livePlayerContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  livePlayerInfo: {
    flex: 1,
    gap: 8,
  },
  livePlayerMeta: {
    flexDirection: "row",
    gap: 12,
  },
  showDetailContainer: {
    flex: 1,
  },
  showDetailContent: {
    padding: 16,
  },
  playlistCardContainer: {
    marginBottom: 16,
  },
  playlistImageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  playButtonSkeleton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
  },
});