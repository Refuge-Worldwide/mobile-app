import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { useAudioStore } from "@/store/audioStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatMessage {
  id: string;
  user_id: string | null;
  username: string;
  message: string;
  created_at: string;
}

const ANON_USERNAME_KEY = "chat_anon_username";

// Audio player height: paddingVertical 4 * 2 + content height 40 = 48px
const AUDIO_PLAYER_HEIGHT = 48;

export default function Chat() {
  const { user } = useAuth();
  const { currentTrack } = useAudioStore();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const insets = useSafeAreaInsets();

  // Calculate tab bar height (matches AudioPlayer calculation)
  const tabBarHeight = 80 + Math.max(insets.bottom, 11);

  // Add extra padding when audio player is visible
  const audioPlayerPadding = currentTrack ? AUDIO_PLAYER_HEIGHT : 0;

  // Total bottom padding: tab bar + audio player (if visible)
  const totalBottomPadding = tabBarHeight + audioPlayerPadding;

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
      const { data, error } = await supabase
        .from("chat")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

    const { error } = await supabase.from("chat").insert({
      user_id: user?.id || null,
      username: username,
      message: newMessage.trim(),
    });

    if (error) {
      console.error("Error sending message:", error);
    } else {
      setNewMessage("");
    }

    setSending(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage =
      (user?.id && item.user_id === user.id) ||
      (!user && item.username === anonUsername);

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage ? textColor : `${textColor}15`,
              borderColor: textColor,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.username,
              { color: isOwnMessage ? backgroundColor : textColor },
            ]}
          >
            {item.username}
          </ThemedText>
          <ThemedText
            style={[
              styles.messageText,
              { color: isOwnMessage ? backgroundColor : textColor },
            ]}
          >
            {item.message}
          </ThemedText>
          <ThemedText
            style={[
              styles.timestamp,
              {
                color: isOwnMessage ? `${backgroundColor}99` : `${textColor}80`,
              },
            ]}
          >
            {formatTime(item.created_at)}
          </ThemedText>
        </View>
      </View>
    );
  };

  // Username prompt modal for anonymous users
  if (isSettingUsername) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.usernamePrompt}>
          <ThemedText type="subtitle" style={styles.promptTitle}>
            Set your username
          </ThemedText>
          <TextInput
            style={[
              styles.usernameInput,
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
          <View style={styles.promptButtons}>
            <Pressable
              onPress={() => {
                setIsSettingUsername(false);
                setTempUsername("");
              }}
              style={[
                styles.promptButton,
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
              style={[styles.promptButton, { backgroundColor: textColor }]}
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
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor, borderBottomColor: textColor },
        ]}
      >
        <View style={styles.headerContent}>
          <ThemedText type="title">Chat</ThemedText>
          {!user && anonUsername && (
            <Pressable onPress={() => setIsSettingUsername(true)}>
              <ThemedText style={[styles.usernameLabel, { color: textColor }]}>
                @{anonUsername}
              </ThemedText>
            </Pressable>
          )}
          {user && (
            <ThemedText style={[styles.usernameLabel, { color: textColor }]}>
              @{getCurrentUsername()}
            </ThemedText>
          )}
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        <View
          style={[
            styles.inputContainer,
            {
              borderTopColor: textColor,
              paddingBottom: 8 + totalBottomPadding,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
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
              styles.sendButton,
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

const styles = StyleSheet.create({
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
    gap: 8,
  },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 2,
  },
  ownMessage: {
    justifyContent: "flex-end",
  },
  otherMessage: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  username: {
    fontSize: 12,
    fontFamily: "VisueltMedium",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    fontFamily: "VisueltMedium",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
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
