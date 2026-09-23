import { RefugeLogo } from "@/components/RefugeLogo";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/ToastNotification";
import { BACKEND_API_URL } from "@/constants/backendApiUrl";
import { isPaidSupporterStatus, useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import Ionicons from "@expo/vector-icons/Ionicons";
import { directus } from "@/lib/directus";
import { readSingleton } from "@directus/sdk";
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
  const {
    user,
    loading,
    isPaidSupporter,
    isStaff,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshUser,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discountCodes, setDiscountCodes] = useState<
    { label?: string; code: string }[] | null
  >(null);
  const [discountCodesError, setDiscountCodesError] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();

  useEffect(() => {
    if (params.mode === "signup") {
      setIsSignUp(true);
    }
  }, [params.mode]);

  useEffect(() => {
    if (!isPaidSupporter) {
      setDiscountCodes(null);
      setDiscountCodesError(false);
      return;
    }

    let cancelled = false;
    directus
      .request(readSingleton("settings", { fields: ["discount_codes"] }))
      .then((settings) => {
        if (cancelled) return;
        setDiscountCodes(
          (settings?.discount_codes as
            | { label?: string; code: string }[]
            | null) ?? [],
        );
      })
      .catch((error) => {
        console.error("Failed to fetch discount codes:", error);
        if (!cancelled) setDiscountCodesError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isPaidSupporter]);

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
      ? await signUp(email, password, username.trim(), newsletter)
      : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setNewsletter(false);
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
    router.push("/(tabs)/account/favorites" as any);
  };

  const handleHistoryPress = () => {
    router.push("/(tabs)/account/history" as any);
  };

  const handleAccountSettings = async () => {
    await WebBrowser.openBrowserAsync(`${BACKEND_API_URL}/account/settings`);
  };

  const handleCopyCode = async (label: string | undefined, code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert(
      "Success",
      `${label ? `${label} discount code` : "Discount code"} ${code} copied to clipboard!`,
    );
  };

  const [checkingStatus, setCheckingStatus] = useState(false);

  // Payment happens outside the app (App Store 3.1.3), so this just re-reads
  // the account once they've confirmed via the emailed link.
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    const updatedUser = await refreshUser();
    setCheckingStatus(false);
    if (!updatedUser) {
      Toast.show({
        type: "error",
        text1: "Couldn't check your account",
        text2: "Please try again in a moment.",
      });
    } else if (isPaidSupporterStatus(updatedUser.subscription_status)) {
      Toast.show({
        type: "success",
        text1: "You're all set!",
        text2: "Your supporter account is active.",
      });
    } else {
      Toast.show({
        type: "error",
        text1: "Not confirmed yet",
        text2: "Check your email to confirm your account.",
      });
    }
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
          {isPaidSupporter && (
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
                  Subscription:
                </ThemedText>
                <ThemedText style={{ color: backgroundColor }}>
                  {isStaff ? "Staff" : "Active"}
                </ThemedText>
              </View>
            </View>
          )}

          <View style={authStyles.buttonsContainer}>
            {isPaidSupporter ? (
              <>
                <ThemedButton
                  title="Favourites"
                  onPress={handleFavoritesPress}
                  variant="outline"
                />

                <ThemedButton
                  title="Listen History"
                  onPress={handleHistoryPress}
                  variant="outline"
                />

                {discountCodesError && (
                  <ThemedText style={authStyles.incompleteMessage}>
                    Couldn&apos;t load discount codes. Please try again
                    later.
                  </ThemedText>
                )}

                {discountCodes?.map((entry, index) => (
                  <ThemedButton
                    key={`${entry.code}-${index}`}
                    title={`Copy ${entry.label ? `${entry.label} ` : ""}discount code`}
                    onPress={() => handleCopyCode(entry.label, entry.code)}
                    variant="outline"
                  />
                ))}

                {/* Paid/staff only: the web settings page offers checkout to
                    unpaid accounts, which the app mustn't link to (3.1.3). */}
                <ThemedButton
                  title="Account Settings"
                  onPress={handleAccountSettings}
                  variant="outline"
                />

              </>
            ) : (
              // No payment wording or links here: App Store 3.1.3 forbids
              // steering users to an outside purchase from inside the app.
              <>
                <ThemedText type="subtitle" style={authStyles.almostThereHeading}>
                  Thanks for signing up!
                </ThemedText>
                <ThemedText style={authStyles.incompleteMessage}>
                  Check your email to confirm your account.
                </ThemedText>

                <ThemedButton
                  title="Refresh account status"
                  onPress={handleCheckStatus}
                  loading={checkingStatus}
                  variant="outline"
                />
              </>
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

          {isSignUp && (
            <Pressable
              style={authStyles.checkboxRow}
              onPress={() => setNewsletter(!newsletter)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: newsletter }}
            >
              <Ionicons
                name={newsletter ? "checkbox" : "square-outline"}
                size={24}
                color={textColor}
              />
              <ThemedText style={authStyles.checkboxLabel}>
                Sign me up to the Refuge Worldwide newsletter
              </ThemedText>
            </Pressable>
          )}

          {isSignUp && (
            <ThemedText style={authStyles.privacyText}>
              By signing up, you agree to our{" "}
              <ThemedText
                style={authStyles.privacyLink}
                onPress={() =>
                  WebBrowser.openBrowserAsync(
                    `${BACKEND_API_URL}/privacy-policy`,
                  )
                }
              >
                Privacy Policy
              </ThemedText>
              .
            </ThemedText>
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkboxLabel: {
    flex: 1,
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
  privacyText: {
    fontSize: 12,
  },
  privacyLink: {
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
  almostThereHeading: {
    textAlign: "center",
    marginBottom: 4,
  },
  incompleteMessage: {
    textAlign: "center",
    marginBottom: 4,
  },
});
