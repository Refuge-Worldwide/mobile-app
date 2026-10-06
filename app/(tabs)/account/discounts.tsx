import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { directus } from "@/lib/directus";
import { readSingleton } from "@directus/sdk";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

type DiscountCode = { label?: string; code: string };

export default function DiscountsScreen() {
  const bottomPadding = useBottomSafePadding();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  const [discountCodes, setDiscountCodes] = useState<DiscountCode[] | null>(null);
  const [discountCodesError, setDiscountCodesError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDiscountCodes = useCallback(async () => {
    try {
      const settings = await directus.request(
        readSingleton("settings", { fields: ["discount_codes"] }),
      );
      setDiscountCodes(
        (settings?.discount_codes as DiscountCode[] | null) ?? [],
      );
      setDiscountCodesError(false);
    } catch (error) {
      console.error("Failed to fetch discount codes:", error);
      setDiscountCodesError(true);
    }
  }, []);

  useEffect(() => {
    fetchDiscountCodes();
  }, [fetchDiscountCodes]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDiscountCodes();
    setRefreshing(false);
  }, [fetchDiscountCodes]);

  const handleCopyCode = async (label: string | undefined, code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert(
      "Success",
      `${label ? `${label} discount code` : "Discount code"} ${code} copied to clipboard!`,
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor, borderBottomColor: textColor },
        ]}
      >
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>Discounts</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding + 40 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={textColor}
            colors={[backgroundColor]}
            progressBackgroundColor={textColor}
          />
        }
      >
        {discountCodesError && (
          <ThemedText style={styles.emptyText}>
            Couldn&apos;t load discount codes. Please try again later.
          </ThemedText>
        )}

        {discountCodes === null && !discountCodesError && (
          <ActivityIndicator size="large" color={textColor} />
        )}

        {discountCodes?.length === 0 && (
          <ThemedText style={styles.emptyText}>
            No discount codes available right now.
          </ThemedText>
        )}

        {discountCodes?.map((entry, index) => (
          <View
            key={`${entry.code}-${index}`}
            style={[styles.row, { borderColor: textColor }]}
          >
            <View style={styles.rowText}>
              {entry.label && (
                <ThemedText style={styles.rowLabel}>{entry.label}</ThemedText>
              )}
              <ThemedText style={styles.rowCode}>Code: {entry.code}</ThemedText>
            </View>
            <Pressable
              onPress={() => handleCopyCode(entry.label, entry.code)}
              style={[styles.copyButton, { borderColor: textColor }]}
              accessibilityLabel={`Copy ${entry.label ? `${entry.label} ` : ""}discount code`}
            >
              <Ionicons name="copy-outline" size={20} color={textColor} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  headerContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 24,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontWeight: "600",
  },
  rowCode: {
    opacity: 0.7,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
