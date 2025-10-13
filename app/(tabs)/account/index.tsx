import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { getFavorites } from '@/lib/favorites';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

export default function AccountScreen() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    const favorites = await getFavorites();
    setFavoritesCount(favorites.length);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setSubmitting(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (isSignUp) {
        Alert.alert(
          'Success',
          'Account created! Please check your email to verify your account.'
        );
      }
      setEmail('');
      setPassword('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setFavoritesCount(0);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (user) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Account
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="subtitle">Email</ThemedText>
            <ThemedText style={styles.email}>{user.email}</ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Favorites</ThemedText>
            <ThemedText style={styles.favoriteCount}>
              {favoritesCount} show{favoritesCount !== 1 ? 's' : ''}
            </ThemedText>
          </View>

          <ThemedButton
            title="Sign Out"
            onPress={handleSignOut}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </ThemedText>

        <View style={styles.form}>
          <ThemedInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <ThemedInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <ThemedButton
            title={isSignUp ? 'Sign Up' : 'Sign In'}
            onPress={handleAuth}
            loading={submitting}
          />

          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <ThemedText style={styles.toggleText}>
              {isSignUp
                ? 'Already have an account? Sign In'
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
    paddingTop: 60,
  },
  title: {
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  toggleButton: {
    padding: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  section: {
    marginBottom: 24,
  },
  email: {
    marginTop: 8,
    fontSize: 16,
  },
  favoriteCount: {
    marginTop: 8,
    fontSize: 16,
  },
});