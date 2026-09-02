import { directus } from '@/lib/directus';
import { passwordRequest, readMe } from '@directus/sdk';
import Constants from 'expo-constants';
import React, { createContext, useContext, useEffect, useState } from 'react';

const BACKEND_API_URL =
  Constants.expoConfig?.extra?.backendApiUrl || process.env.EXPO_PUBLIC_API_URL;

interface DirectusUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  subscription_status?: string | null;
}

interface AuthContextType {
  user: DirectusUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => { },
  resetPassword: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const ME_FIELDS = ['id', 'email', 'first_name', 'last_name', 'subscription_status'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DirectusUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from stored token
    directus
      .request(readMe({ fields: ME_FIELDS }))
      .then((me) => setUser(me as DirectusUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await directus.login({ email, password });
      const me = await directus.request(readMe({ fields: ME_FIELDS }));
      setUser(me as DirectusUser);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: new Error(data.error || 'Could not create your account') };
      }

      // Account now exists — sign in the normal way.
      await directus.login({ email, password });
      const me = await directus.request(readMe({ fields: ME_FIELDS }));
      setUser(me as DirectusUser);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await directus.logout();
    } catch {
      // ignore errors on logout
    }
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    try {
      await directus.request(passwordRequest(email));
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}
