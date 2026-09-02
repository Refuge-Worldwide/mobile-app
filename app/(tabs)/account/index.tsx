import { RefugeLogo } from "@/components/RefugeLogo";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();

  useEffect(() => {
    if (params.mode === "signup") {
      setIsSignUp(true);
    }
  }, [params.mode]);

  const isPaidSupporter =
    user?.subscription_status === "active" ||
    user?.subscription_status === "past_due";

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (isSignUp && !username.trim()) {
      Alert.alert("Error", "Please choose a username");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setSubmitting(true);
    const { error } = isSignUp
      ? await signUp(email, password, username.trim())
      : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      if (isSignUp) {
        Alert.alert(
          "Welcome!",
          "Your account is ready — complete your account setup any time from here to unlock saving shows and more. We've also sent you an email with a link to do that.",
        );
      }
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    }
  };

  const handleSignOut = async () => {
    await signOut();
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

  const handleBecomeSupporter = async () => {
    await WebBrowser.openBrowserAsync("https://refugeworldwide.com/supporters");
  };

  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  if (loading) {
    return (
      <ThemedView style={authStyles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (user) {
    return (
      <ThemedView style={authStyles.container}>
        <ScrollView contentContainerStyle={authStyles.scrollContent}>
          <View style={[authStyles.card, { backgroundColor: textColor }]}>
            <View style={authStyles.nameContainer}>
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
            <View style={authStyles.cardRow}>
              <ThemedText style={{ color: backgroundColor }}>
                Joined:
              </ThemedText>
              <ThemedText style={{ color: backgroundColor }}>
                January 24, 2024
              </ThemedText>
            </View>
            <View style={authStyles.cardRow}>
              <ThemedText style={{ color: backgroundColor }}>
                Subscription:
              </ThemedText>
              <ThemedText style={{ color: backgroundColor }}>
                {isPaidSupporter ? "Active" : "Not a Supporter yet"}
              </ThemedText>
            </View>
          </View>

          <View style={authStyles.buttonsContainer}>
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

            {isPaidSupporter ? (
              <>
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
              </>
            ) : (
              <ThemedButton
                title="Complete Account Setup"
                onPress={handleBecomeSupporter}
                variant="outline"
              />
            )}

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
    <ThemedView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.form}>
          <ThemedInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {isSignUp && (
            <ThemedInput
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}

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
                style={authStyles.forgotPassword}
                onPress={handleForgotPassword}
                disabled={submitting}
              >
                <ThemedText style={authStyles.forgotPasswordText}>
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
            style={authStyles.toggleButton}
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

const authStyles = StyleSheet.create({
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
