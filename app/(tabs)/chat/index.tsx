import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Image } from "expo-image";
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
  const { user } = useAuth();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const totalBottomPadding = useBottomSafePadding();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [anonUsername, setAnonUsername] = useState("");
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
      }
    };
    loadAnonUsername();
  }, []);

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

  // Subscribe to realtime updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const listen = async () => {
      try {
        const { subscription, unsubscribe: unsub } = await directus.subscribe(
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
    };
  }, []);

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
      // Use email prefix as username for logged in users
      return user.email.split("@")[0];
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
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isToday) return `today ${time}`;
    if (isYesterday) return `yesterday ${time}`;
    return `${date.toLocaleDateString([], { day: "2-digit", month: "2-digit" })} ${time}`;
  };

  const GROUP_WINDOW_MS = 5 * 60 * 1000;

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
          <ThemedText style={[chatStyles.messageText, { color: `${textColor}e6` }]}>
            {item.message}
          </ThemedText>
        ) : null}
        {item.image && <ChatImage uri={item.image} />}
      </View>
    );
  };

  // Username prompt modal for anonymous users
  if (isSettingUsername) {
    return (
      <ThemedView style={chatStyles.container}>
        <View style={chatStyles.usernamePrompt}>
          <ThemedText type="subtitle" style={chatStyles.promptTitle}>
            Set your username
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
                setIsSettingUsername(false);
                setTempUsername("");
              }}
              style={[
                chatStyles.promptButton,
                { borderColor: textColor, borderWidth: 1 },
              ]}
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                if (tempUsername.trim()) {
                  saveAnonUsername(tempUsername.trim());
                }
              }}
              style={[chatStyles.promptButton, { backgroundColor: textColor }]}
              disabled={!tempUsername.trim()}
            >
              <ThemedText style={{ color: backgroundColor }}>Save</ThemedText>
            </Pressable>
          </View>
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
          {!user && anonUsername && (
            <Pressable onPress={() => setIsSettingUsername(true)}>
              <ThemedText style={[chatStyles.usernameLabel, { color: textColor }]}>
                @{anonUsername}
              </ThemedText>
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
  username: {
    fontSize: 13,
    fontFamily: "VisueltMedium",
  },
  messageText: {
    fontSize: 16,
    fontFamily: "VisueltMedium",
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
});
