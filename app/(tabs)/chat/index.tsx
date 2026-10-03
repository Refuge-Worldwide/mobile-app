import { BottomSheet } from "@/components/BottomSheet";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { directus, directusPublic } from "@/lib/directus";
import {
  createChatRealtimeClient,
  fetchRealtimeToken,
  type ChatMessage,
} from "@/lib/chatRealtime";
import { splitOnUrls, isUrl } from "@/lib/linkify";
import { readItems, updateMe } from "@directus/sdk";
import { useIsFocused } from "@react-navigation/native";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextProps,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const ANON_USERNAME_KEY = "chat_anon_username";

const BACKEND_API_URL =
  Constants.expoConfig?.extra?.backendApiUrl ||
  process.env.EXPO_PUBLIC_API_URL;

// TODO chat improvements still to do:
// - link previews (card with title/image under the message, needs a
//   backend endpoint to fetch the page's og tags)
// - emoji reactions on messages
// - reply/quote a specific message
// - long press menu to copy or report a message
// - load older messages by scrolling up past the current 50 limit
// - typing indicator
// - gif support

function LinkifiedText({
  text,
  style,
  linkStyle,
}: {
  text: string;
  style: TextProps["style"];
  linkStyle: TextProps["style"];
}) {
  const parts = splitOnUrls(text);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        isUrl(part) ? (
          <Text
            key={i}
            style={linkStyle}
            onPress={() => Linking.openURL(part)}
          >
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

// Chat images are always 16:9, so the box size is known upfront - no async
// measuring, no layout shift on load, and no resize when FlatList remounts
// a row while scrolling. Tracks which URLs have already loaded once, across
// mounts, so a remount of an already-seen image skips the loading state
// instead of flashing it again.
const loadedImages = new Set<string>();

function ChatImage({ uri }: { uri: string }) {
  const [loaded, setLoaded] = useState(loadedImages.has(uri));
  const textColor = useThemeColor({}, "text");
  return (
    <View
      style={{
        width: "65%",
        aspectRatio: 16 / 9,
        marginTop: 4,
        overflow: "hidden",
        backgroundColor: "#ffffff14",
      }}
    >
      {!loaded && (
        <ActivityIndicator color={textColor} style={StyleSheet.absoluteFillObject} />
      )}
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%", opacity: loaded ? 1 : 0 }}
        contentFit="cover"
        onLoad={() => {
          loadedImages.add(uri);
          setLoaded(true);
        }}
      />
    </View>
  );
}

export default function Chat() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const totalBottomPadding = useBottomSafePadding();
  const isFocused = useIsFocused();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [anonUsername, setAnonUsername] = useState("");
  const [anonUsernameLoaded, setAnonUsernameLoaded] = useState(false);
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  const usernameSheetRef = useRef<BottomSheetModal>(null);

  // Presents/dismisses the sheet as a bottom sheet over the chat, instead of
  // replacing the whole screen - the chat (and its scroll position) stays
  // mounted underneath, so saving a username no longer "reloads" it.
  useEffect(() => {
    if (isSettingUsername) {
      usernameSheetRef.current?.present();
    } else {
      usernameSheetRef.current?.dismiss();
    }
  }, [isSettingUsername]);
  const [sending, setSending] = useState(false);
  // True once the initial history has settled into its scrolled-to-bottom
  // position - kept separate from the fetch itself so the list stays behind
  // the spinner for that settling window instead of flashing at the top
  // first (see isInitialLoadSettlingRef).
  const [listReady, setListReady] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  // Tracks whether the viewer is already at the bottom, so a new message
  // only auto-scrolls them when they haven't scrolled up to read history.
  const isNearBottomRef = useRef(true);
  // Until the viewer actually drags the list themselves, the programmatic
  // scrolls done while settling in (onContentSizeChange) can throw off the
  // onScroll-derived isNearBottomRef with a stale reading mid-animation -
  // so it's ignored and treated as "at the bottom" until a real scroll gesture happens.
  const hasUserScrolledRef = useRef(false);
  // FlatList renders/measures the initial history over several
  // onContentSizeChange calls (virtualization), not just one, so a single
  // scrollToEnd right when the data lands can undershoot and leave the view
  // stuck above the true bottom. This stays true only while that initial
  // settling is still happening, so onContentSizeChange can keep pinning to
  // the bottom through it without responding to later, unrelated size
  // changes (e.g. an image loading).
  const isInitialLoadSettlingRef = useRef(false);
  // Whether there's older history left to page back through - reset to true
  // on every fresh connect/reconnect, since that starts a new baseline.
  const hasMoreHistoryRef = useRef(true);
  const isLoadingOlderRef = useRef(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Set right before an older-history prepend's setMessages call, and
  // consumed (reset) by the scroll-to-bottom effect below - so that effect
  // can tell a prepend's length increase apart from a new live message's,
  // without racing isLoadingOlderRef's own reset in loadOlderMessages'
  // finally block (which lands in the same tick as the prepend, before this
  // effect ever runs).
  const lastChangeWasPrependRef = useRef(false);

  // Load anonymous username from storage
  useEffect(() => {
    const loadAnonUsername = async () => {
      try {
        const stored = await AsyncStorage.getItem(ANON_USERNAME_KEY);
        if (stored) {
          setAnonUsername(stored);
        }
      } catch (error) {
        console.error("Failed to load anon username:", error);
      } finally {
        setAnonUsernameLoaded(true);
      }
    };
    loadAnonUsername();
  }, []);

  // Prompt for a username straight away if there isn't one yet, rather than
  // waiting for the visitor to tap the pencil or try to send a message.
  // Waits on both auth and the AsyncStorage read so it doesn't flash for a
  // signed-in user or someone who already has a stored name.
  useEffect(() => {
    if (!authLoading && anonUsernameLoaded && !user && !anonUsername) {
      setIsSettingUsername(true);
    }
  }, [authLoading, anonUsernameLoaded, user, anonUsername]);

  // Subscribe to realtime updates. Every visitor, signed in or not, connects
  // via the shared read-only "Chat Reader" client — matching the website's
  // approach, and keeping the live feed connection independent of a signed-in
  // user's own session (see lib/chatRealtime.ts).
  const clientRef = useRef<ReturnType<typeof createChatRealtimeClient> | null>(null);
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const cancelledRef = useRef(true);
  const connectedRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleDisconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const listen = useCallback(async (attempt: number) => {
    if (cancelledRef.current) return;

    try {
      const token = await fetchRealtimeToken();
      if (cancelledRef.current) return;

      const client = createChatRealtimeClient(token);
      clientRef.current = client;

      // Subscribing with a sort/limit query gets the latest page of history
      // back as the subscription's own "init" event below - the same one
      // socket then carries every live update after, so there's no separate
      // REST call to Directus (or our backend) for history at all.
      const { subscription, unsubscribe } = await client.subscribe("chat", {
        query: { sort: ["-date_created"], limit: 50 },
      });
      unsubscribeRef.current = unsubscribe;
      setIsReconnecting(false);

      for await (const message of subscription) {
        if (cancelledRef.current) break;
        if (message.event === "init") {
          // Comes back newest-first (so the limit catches the latest page,
          // not the oldest) - reverse to oldest-first for display.
          const initialMessages = (message.data as unknown as ChatMessage[])
            .slice()
            .reverse();
          setMessages(initialMessages);
          hasMoreHistoryRef.current = initialMessages.length === 50;
          isInitialLoadSettlingRef.current = true;
          setTimeout(() => {
            if (cancelledRef.current) return;
            isInitialLoadSettlingRef.current = false;
            flatListRef.current?.scrollToOffset({ offset: 999999, animated: false });
            setTimeout(() => {
              if (cancelledRef.current) return;
              flatListRef.current?.scrollToOffset({ offset: 999999, animated: false });
              setListReady(true);
              setTimeout(() => {
                if (!cancelledRef.current) {
                  flatListRef.current?.scrollToOffset({ offset: 999999, animated: false });
                }
              }, 300);
            }, 250);
          }, 500);
        } else if (message.event === "create") {
          const newMsgs = message.data as unknown as ChatMessage[];
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const deduped = newMsgs.filter((m) => !existingIds.has(m.id));
            return deduped.length > 0 ? [...prev, ...deduped] : prev;
          });
        } else if (message.event === "update") {
          const updated = message.data as unknown as ChatMessage[];
          const byId = new Map(updated.map((m) => [m.id, m]));
          setMessages((prev) => prev.map((m) => byId.get(m.id) ?? m));
        } else if (message.event === "delete") {
          const deletedIds = new Set((message.data as (string | number)[]).map(String));
          setMessages((prev) => prev.filter((m) => !deletedIds.has(String(m.id))));
        }
      }
    } catch (error) {
      console.error("Error subscribing to chat:", error);
      if (!cancelledRef.current) setListReady(true);
    }

    if (!cancelledRef.current) {
      setIsReconnecting(true);
      const delay = Math.min(30000, 1000 * 2 ** attempt);
      retryTimeoutRef.current = setTimeout(() => listen(attempt + 1), delay);
    }
  }, []);

  const connectRealtime = useCallback(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    cancelledRef.current = false;
    listen(0);
  }, [listen]);

  // Pages back through history older than what the socket's init snapshot
  // covered - a plain REST call, since Directus's websocket subscribe has no
  // "load more" of its own. Public role has read access to `chat`, so this
  // goes straight to Directus rather than through the backend.
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlderRef.current || !hasMoreHistoryRef.current) return;
    const oldest = messages[0];
    if (!oldest) return;

    isLoadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const older = await directusPublic.request(
        readItems("chat", {
          filter: { id: { _lt: oldest.id } },
          sort: ["-date_created"],
          limit: 50,
        }),
      );
      const olderMessages = (older as unknown as ChatMessage[]).slice().reverse();
      hasMoreHistoryRef.current = olderMessages.length === 50;

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const toPrepend = olderMessages.filter((m) => !existingIds.has(m.id));
        if (toPrepend.length === 0) return prev;
        lastChangeWasPrependRef.current = true;
        return [...toPrepend, ...prev];
      });
    } catch (error) {
      console.error("Error loading older chat messages:", error);
    } finally {
      isLoadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [messages]);

  const disconnectRealtime = useCallback(() => {
    if (!connectedRef.current) return;
    connectedRef.current = false;
    cancelledRef.current = true;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    unsubscribeRef.current?.();
    clientRef.current?.disconnect();
    clientRef.current = null;
    unsubscribeRef.current = undefined;
    setIsReconnecting(false);
  }, []);

  useEffect(() => {
    connectRealtime();
    return () => {
      if (idleDisconnectTimeoutRef.current) clearTimeout(idleDisconnectTimeoutRef.current);
      disconnectRealtime();
    };
  }, [connectRealtime, disconnectRealtime]);

  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isFocused && appActive) {
      if (idleDisconnectTimeoutRef.current) {
        clearTimeout(idleDisconnectTimeoutRef.current);
        idleDisconnectTimeoutRef.current = undefined;
      }
      connectRealtime();
    } else {
      idleDisconnectTimeoutRef.current = setTimeout(() => {
        disconnectRealtime();
      }, 60000);
    }
  }, [isFocused, appActive, connectRealtime, disconnectRealtime]);

  // Marks a new message as wanting a scroll, but doesn't scroll here -
  // calling scrollToEnd() right in this effect can fire before FlatList has
  // actually measured the new item's layout and silently fall short.
  // onContentSizeChange (below) only fires once that layout is real, so the
  // scroll is deferred to there instead.
  const messageCountRef = useRef(0);
  const pendingScrollToBottomRef = useRef(false);
  useEffect(() => {
    if (lastChangeWasPrependRef.current) {
      lastChangeWasPrependRef.current = false;
    } else if (
      messages.length > messageCountRef.current &&
      !isInitialLoadSettlingRef.current &&
      isNearBottomRef.current
    ) {
      pendingScrollToBottomRef.current = true;
    }
    messageCountRef.current = messages.length;
  }, [messages.length]);

  const getCurrentUsername = useCallback(() => {
    if (user?.email) {
      // Same name as the account's "Username" field on the website
      // (Account Settings), which is Directus's first_name — not the email,
      // which was never meant to be shown.
      return user.first_name?.trim() || user.email.split("@")[0];
    }
    return anonUsername;
  }, [user, anonUsername]);

  const saveUsername = async (username: string) => {
    // Mirrors the website's update-profile / chat send validation
    if (username.length < 2) {
      Alert.alert("Username too short", "Use at least 2 characters.");
      return;
    }
    if (username.toLowerCase().includes("refuge")) {
      Alert.alert("Username unavailable", "That username is reserved.");
      return;
    }

    try {
      if (user) {
        await directus.request(updateMe({ first_name: username }));
        await refreshUser();
      } else {
        await AsyncStorage.setItem(ANON_USERNAME_KEY, username);
        setAnonUsername(username);
      }
      setIsSettingUsername(false);
      setTempUsername("");
    } catch (error) {
      console.error("Failed to save username:", error);
      Alert.alert("Couldn't save username", "Please try again.");
    }
  };

  const sendMessage = async () => {
    const username = getCurrentUsername();

    if (!newMessage.trim()) return;
    if (!username) {
      setIsSettingUsername(true);
      return;
    }

    setSending(true);

    try {
      const token = await directus.getToken();
      const response = await fetch(`${BACKEND_API_URL}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username, message: newMessage.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to send message");
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert(
        "Message not sent",
        error instanceof Error ? error.message : "Please try again.",
      );
    }

    setSending(false);
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}, ${time}`;
  };

  const GROUP_WINDOW_MS = 2 * 60 * 1000;

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    if (item.is_system) {
      return (
        <View style={chatStyles.systemMessageRow}>
          <View
            style={[chatStyles.systemDivider, { backgroundColor: `${textColor}33` }]}
          />
          <ThemedText
            style={[chatStyles.systemMessageText, { color: `${textColor}B3` }]}
          >
            Live now: {item.message}
          </ThemedText>
          {item.image && <ChatImage uri={item.image} />}
        </View>
      );
    }

    const previous = index > 0 ? messages[index - 1] : null;
    const isGrouped =
      !!previous &&
      previous.username === item.username &&
      new Date(item.date_created).getTime() - new Date(previous.date_created).getTime() <
        GROUP_WINDOW_MS;

    return (
      <View style={[chatStyles.messageRow, isGrouped && chatStyles.messageRowGrouped]}>
        {!isGrouped && (
          <View style={chatStyles.metaRow}>
            <ThemedText style={[chatStyles.username, { color: textColor }]}>
              {item.username}
            </ThemedText>
            <ThemedText style={[chatStyles.timestamp, { color: `${textColor}80` }]}>
              {formatTimestamp(item.date_created)}
            </ThemedText>
          </View>
        )}
        {item.message ? (
          <LinkifiedText
            text={item.message}
            style={[chatStyles.messageText, { color: textColor }]}
            linkStyle={{ textDecorationLine: "underline" }}
          />
        ) : null}
        {item.image && <ChatImage uri={item.image} />}
      </View>
    );
  };

  // First-time anon visitors (no stored username yet) are joining the chat;
  // anyone else opening this via the pencil is just changing their name.
  const isFirstTimeUsername = !user && !anonUsername;

  return (
    <ThemedView style={chatStyles.container}>
      <View
        style={[
          chatStyles.headerContainer,
          { backgroundColor, borderBottomColor: textColor },
        ]}
      >
        <View style={chatStyles.headerContent}>
          <ThemedText type="title">Chat</ThemedText>
          <Pressable
            onPress={() => {
              // Pre-filled so tapping Save with no edits just keeps the
              // current name — there's no separate Cancel button.
              setTempUsername(getCurrentUsername());
              setIsSettingUsername(true);
            }}
            style={chatStyles.identityRow}
          >
            <ThemedText style={[chatStyles.usernameLabel, { color: textColor }]}>
              @{getCurrentUsername() || "anon"}
            </ThemedText>
            <Ionicons name="pencil-outline" size={16} color={textColor} />
          </Pressable>
        </View>
      </View>
      {isReconnecting && (
        <View style={[chatStyles.reconnectBanner, { backgroundColor, borderBottomColor: textColor }]}>
          <ActivityIndicator size="small" color={textColor} />
          <ThemedText style={[chatStyles.reconnectText, { color: textColor }]}>
            Reconnecting to chat…
          </ThemedText>
        </View>
      )}
      <KeyboardAvoidingView style={chatStyles.keyboardAvoid} behavior="padding">
        <View style={chatStyles.messageListWrap}>
          {!listReady && (
            <View style={[chatStyles.listLoadingOverlay, { backgroundColor }]}>
              <ActivityIndicator color={textColor} />
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            style={[chatStyles.messageList, !listReady && chatStyles.hidden]}
            contentContainerStyle={chatStyles.messageListContent}
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={
              listReady ? { minIndexForVisible: 0 } : undefined
            }
            onStartReached={() => {
              if (listReady) loadOlderMessages();
            }}
            onStartReachedThreshold={0.3}
            ListHeaderComponent={
              loadingOlder ? (
                <View style={chatStyles.loadOlderFooter}>
                  <ActivityIndicator size="small" color={textColor} />
                </View>
              ) : null
            }
            onContentSizeChange={() => {
              if (isInitialLoadSettlingRef.current) {
                flatListRef.current?.scrollToOffset({ offset: 999999, animated: false });
              } else if (pendingScrollToBottomRef.current) {
                pendingScrollToBottomRef.current = false;
                flatListRef.current?.scrollToOffset({ offset: 999999, animated: true });
              }
            }}
            onScroll={(e) => {
              if (!hasUserScrolledRef.current) return;
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const distanceFromBottom =
                contentSize.height - contentOffset.y - layoutMeasurement.height;
              isNearBottomRef.current = distanceFromBottom < 80;
            }}
            onScrollBeginDrag={() => {
              hasUserScrolledRef.current = true;
            }}
          />
        </View>

        <View
          style={[
            chatStyles.inputContainer,
            {
              borderTopColor: textColor,
              paddingBottom: 8 + totalBottomPadding,
            },
          ]}
        >
          <TextInput
            style={[
              chatStyles.input,
              {
                color: textColor,
                borderColor: textColor,
                backgroundColor: backgroundColor,
              },
            ]}
            placeholder={
              getCurrentUsername() ? "Type a message..." : "Set username first"
            }
            placeholderTextColor={`${textColor}60`}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <Pressable
            onPress={sendMessage}
            disabled={sending || !newMessage.trim()}
            style={[
              chatStyles.sendButton,
              {
                backgroundColor: textColor,
                opacity: sending || !newMessage.trim() ? 0.5 : 1,
              },
            ]}
          >
            <ThemedText style={{ color: backgroundColor }}>Send</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        ref={usernameSheetRef}
        snapPoints={["32%"]}
        onDismiss={() => setIsSettingUsername(false)}
      >
        <View style={chatStyles.usernamePrompt}>
          <ThemedText type="subtitle" style={chatStyles.promptTitle}>
            {isFirstTimeUsername
              ? "Set your username to join the chat."
              : "Change your username"}
          </ThemedText>

          <View style={chatStyles.usernamePromptBottom}>
            <BottomSheetTextInput
              style={[
                chatStyles.usernameInput,
                {
                  color: textColor,
                  borderColor: textColor,
                  backgroundColor: backgroundColor,
                },
              ]}
              placeholder="Enter username..."
              placeholderTextColor={`${textColor}60`}
              value={tempUsername}
              onChangeText={setTempUsername}
              autoFocus
              autoCapitalize="none"
              maxLength={20}
            />
            <View style={chatStyles.promptButtons}>
              <Pressable
                onPress={() => {
                  if (tempUsername.trim()) {
                    saveUsername(tempUsername.trim());
                  }
                }}
                style={[chatStyles.promptButton, { backgroundColor: textColor }]}
                disabled={!tempUsername.trim()}
              >
                <ThemedText style={{ color: backgroundColor }}>
                  {isFirstTimeUsername ? "Join" : "Save"}
                </ThemedText>
              </Pressable>
            </View>

            {isFirstTimeUsername && (
              <Pressable
                onPress={() => {
                  setIsSettingUsername(false);
                  router.push("/account");
                }}
                style={chatStyles.signInRow}
              >
                <ThemedText style={{ color: `${textColor}80` }}>
                  Already have an account?{" "}
                </ThemedText>
                <ThemedText style={[chatStyles.signInLabel, { color: textColor }]}>
                  Sign in
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </BottomSheet>
    </ThemedView>
  );
}

const chatStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  reconnectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  reconnectText: {
    fontSize: 12,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  usernameLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messageListWrap: {
    flex: 1,
  },
  listLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  loadOlderFooter: {
    paddingVertical: 12,
    alignItems: "center",
  },
  hidden: {
    opacity: 0,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  messageListContent: {
    paddingVertical: 12,
  },
  messageRow: {
    marginTop: 14,
  },
  messageRowGrouped: {
    marginTop: 2,
  },
  systemMessageRow: {
    marginTop: 14,
  },
  systemDivider: {
    height: 1,
    marginBottom: 8,
  },
  systemMessageText: {
    fontSize: 16,
    fontFamily: "VisueltMedium",
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 3,
  },
  // Medium vs. Light is what separates the name from the message body —
  // fontWeight has no real effect on VisueltMedium (no bold cut loaded), so
  // this uses two actual font files instead of a synthetic weight.
  username: {
    fontSize: 16,
    fontFamily: "VisueltMedium",
  },
  messageText: {
    fontSize: 16,
    fontFamily: "VisueltLight",
    lineHeight: 21,
  },
  timestamp: {
    fontSize: 10,
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: "VisueltMedium",
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  usernamePrompt: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 24,
  },
  usernamePromptBottom: {
    width: "100%",
    alignItems: "center",
  },
  promptTitle: {
    marginBottom: 24,
  },
  usernameInput: {
    width: "100%",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: "VisueltMedium",
    marginBottom: 24,
  },
  promptButtons: {
    width: "100%",
  },
  promptButton: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  signInRow: {
    flexDirection: "row",
    marginTop: 20,
  },
  signInLabel: {
    textDecorationLine: "underline",
  },
});
