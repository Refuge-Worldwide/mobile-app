import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { directus } from "@/lib/directus";
import { createAnonChatRealtimeClient } from "@/lib/chatRealtime";
import { readItems } from "@directus/sdk";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface ChatMessage {
  id: number;
  user: string | null;
  username: string;
  message: string;
  image: string | null;
  date_created: string;
}

const ANON_USERNAME_KEY = "chat_anon_username";

const BACKEND_API_URL =
  Constants.expoConfig?.extra?.backendApiUrl ||
  process.env.EXPO_PUBLIC_API_URL;

function ChatImage({ uri }: { uri: string }) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  return (
    <View style={{ width: "100%", marginTop: 4 }}>
      <Image
        source={{ uri }}
        style={{ width: "100%", aspectRatio: aspectRatio ?? 1, opacity: aspectRatio ? 1 : 0 }}
        contentFit="cover"
        onLoad={(e) => {
          const { width, height } = e.source;
          if (width && height) setAspectRatio(width / height);
        }}
      />
    </View>
  );
}

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const totalBottomPadding = useBottomSafePadding();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [anonUsername, setAnonUsername] = useState("");
  const [anonUsernameLoaded, setAnonUsernameLoaded] = useState(false);
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

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

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await directus.request(
          readItems("chat", {
            sort: ["date_created"],
            limit: 100,
          }),
        );
        setMessages(data as unknown as ChatMessage[]);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, []);

  // Subscribe to realtime updates. Signed-in users authenticate the socket
  // with their own token via the shared `directus` client. Anonymous users
  // have no token, and this Directus instance's websocket layer requires
  // every connection to authenticate — so they connect via a dedicated
  // read-only client instead (see lib/chatRealtime.ts). Re-subscribes if
  // auth state changes while the screen is open.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    let anonClient: Awaited<ReturnType<typeof createAnonChatRealtimeClient>> | null = null;

    const listen = async () => {
      try {
        const client = user ? directus : (anonClient = await createAnonChatRealtimeClient());
        if (cancelled) return;

        const { subscription, unsubscribe: unsub } = await client.subscribe(
          "chat",
          { event: "create" },
        );
        unsubscribe = unsub;

        for await (const message of subscription) {
          if (cancelled) break;
          if (message.event === "create") {
            const newMsgs = message.data as unknown as ChatMessage[];
            setMessages((prev) => [...prev, ...newMsgs]);
          }
        }
      } catch (error) {
        console.error("Error subscribing to chat:", error);
      }
    };

    listen();

    return () => {
      cancelled = true;
      unsubscribe?.();
      anonClient?.disconnect();
    };
  }, [user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
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

  const saveAnonUsername = async (username: string) => {
    try {
      await AsyncStorage.setItem(ANON_USERNAME_KEY, username);
      setAnonUsername(username);
      setIsSettingUsername(false);
      setTempUsername("");
    } catch (error) {
      console.error("Failed to save anon username:", error);
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
          <ThemedText style={[chatStyles.messageText, { color: textColor }]}>
            {item.message}
          </ThemedText>
        ) : null}
        {item.image && <ChatImage uri={item.image} />}
      </View>
    );
  };

  // Username prompt modal for anonymous users. First-time visitors (no
  // stored anon username yet) are joining the chat; returning anon visitors
  // opening this via the pencil are just changing their name.
  if (isSettingUsername) {
    const isFirstTime = !anonUsername;

    return (
      <ThemedView style={chatStyles.container}>
        <View style={chatStyles.usernamePrompt}>
          <ThemedText type="subtitle" style={chatStyles.promptTitle}>
            {isFirstTime
              ? "Set your username to join the chat."
              : "Change your username"}
          </ThemedText>
          <TextInput
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
                  saveAnonUsername(tempUsername.trim());
                }
              }}
              style={[chatStyles.promptButton, { backgroundColor: textColor }]}
              disabled={!tempUsername.trim()}
            >
              <ThemedText style={{ color: backgroundColor }}>
                {isFirstTime ? "Join" : "Save"}
              </ThemedText>
            </Pressable>
          </View>

          {isFirstTime && (
            <Pressable
              onPress={() => router.push("/account")}
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
      </ThemedView>
    );
  }

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
          {!user && (
            <Pressable
              onPress={() => {
                // Pre-filled so tapping Save with no edits just keeps the
                // current name — there's no separate Cancel button.
                setTempUsername(anonUsername);
                setIsSettingUsername(true);
              }}
              style={chatStyles.identityRow}
            >
              <ThemedText style={[chatStyles.usernameLabel, { color: textColor }]}>
                @{anonUsername || "anon"}
              </ThemedText>
              <Ionicons name="pencil-outline" size={16} color={textColor} />
            </Pressable>
          )}
          {user && (
            <ThemedText style={[chatStyles.usernameLabel, { color: textColor }]}>
              @{getCurrentUsername()}
            </ThemedText>
          )}
        </View>
      </View>
      <KeyboardAvoidingView
        style={chatStyles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => String(item.id)}
          style={chatStyles.messageList}
          contentContainerStyle={chatStyles.messageListContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
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
    flexDirection: "row",
    gap: 12,
  },
  promptButton: {
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
