import { RefugeLogo } from "@/components/RefugeLogo";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getFavourites } from "@/lib/favourites";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function AccountScreen() {
  const { user, loading, signIn, signUp, signOut, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadFavoritesCount();
    }
  }, [user]);

  const loadFavoritesCount = async () => {
    const favourites = await getFavourites();
    setFavoritesCount(favourites.length);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setSubmitting(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      if (isSignUp) {
        Alert.alert(
          "Success",
          "Account created! Please check your email to verify your account.",
        );
      }
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setFavoritesCount(0);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Success",
        "Password reset email sent! Please check your inbox.",
      );
    }
  };

  const handleFavoritesPress = () => {
    router.push("/(tabs)/playlist/playlist/favorites");
  };

  const handlePodcastPress = () => {
    router.push("/(tabs)/account/podcast");
  };

  const handleCopyDiscountCode = async () => {
    const discountCode = "REFUGE2024";
    await Clipboard.setStringAsync(discountCode);
    Alert.alert(
      "Success",
      `Discount code ${discountCode} copied to clipboard!`,
    );
  };

  const handleManageSubscription = async () => {
    await WebBrowser.openBrowserAsync("https://refugeworldwide.com");
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  if (user) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: textColor }]}>
            <View style={styles.nameContainer}>
              <ThemedText
                style={{ color: backgroundColor }}
                adjustsFontSizeToFit
                numberOfLines={1}
                minimumFontScale={0.5}
                type="title"
              >
                {user.email}
              </ThemedText>
            </View>
            <View
              style={{ marginTop: 28, marginBottom: 36, alignItems: "center" }}
            >
              <RefugeLogo size={70} variant="background" />
            </View>
            <View style={styles.cardRow}>
              <ThemedText style={{ color: backgroundColor }}>
                Joined:
              </ThemedText>
              <ThemedText style={{ color: backgroundColor }}>
                January 24, 2024
              </ThemedText>
            </View>
            <View style={styles.cardRow}>
              <ThemedText style={{ color: backgroundColor }}>
                Subscription:
              </ThemedText>
              <ThemedText style={{ color: backgroundColor }}>Active</ThemedText>
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <ThemedButton
              title="Favourites Shows"
              onPress={handleFavoritesPress}
              variant="outline"
            />

            <ThemedButton
              title="Podcasts"
              onPress={handlePodcastPress}
              variant="outline"
            />

            <ThemedButton
              title="Copy Discount Code"
              onPress={handleCopyDiscountCode}
              variant="outline"
            />

            <ThemedButton
              title="Manage Subscription"
              onPress={handleManageSubscription}
              variant="outline"
            />

            <ThemedButton
              title="Sign Out"
              onPress={handleSignOut}
              variant="outline"
            />
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* <ThemedText type="title" style={styles.title}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </ThemedText> */}

        <View style={styles.form}>
          <ThemedInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View>
            <ThemedInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {!isSignUp && (
              <Pressable
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
                disabled={submitting}
              >
                <ThemedText style={styles.forgotPasswordText}>
                  Forgot your password?
                </ThemedText>
              </Pressable>
            )}
          </View>

          {isSignUp && (
            <ThemedInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          )}

          <ThemedButton
            title={isSignUp ? "Sign Up" : "Sign In"}
            onPress={handleAuth}
            loading={submitting}
          />

          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <ThemedText style={{ textDecorationLine: "underline" }}>
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    marginBottom: 30,
    textAlign: "center",
  },
  form: {
    gap: 24,
  },
  toggleButton: {
    padding: 8,
    alignItems: "center",
    marginTop: -8,
  },
  toggleText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  forgotPassword: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  card: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
  },
  nameContainer: {
    width: "100%",
    alignItems: "center",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttonsContainer: {
    gap: 8,
  },
});
