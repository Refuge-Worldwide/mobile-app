import { BACKEND_API_URL } from '@/constants/backendApiUrl';
import { directus } from '@/lib/directus';
import { passwordRequest, readMe } from '@directus/sdk';
import React, { createContext, useContext, useEffect, useState } from 'react';

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
  // True once payment has actually gone through (or is merely late,
  // "past_due" — still a supporter) — NOT the same as being signed in.
  // Every app account starts out signed-in-but-unpaid ("Incomplete" on the
  // account screen), so anything that's actually a supporter perk (saving
  // shows, podcasts, discount codes, ...) must gate on this, not on
  // `!!user`. The "become a supporter" promos (SupporterBanner/
  // SupporterPrompt) are the one deliberate exception — those stay gated
  // on sign-in alone so they stop appearing once someone has an account,
  // whether or not they've paid yet.
  isPaidSupporter: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  // Re-pulls the current user (e.g. subscription_status) without a full
  // sign-in — used after returning from the website's Stripe checkout, so
  // the account screen reflects a new subscription immediately.
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isPaidSupporter: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => { },
  resetPassword: async () => ({ error: null }),
  refreshUser: async () => { },
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
  const isPaidSupporter =
    user?.subscription_status === 'active' ||
    user?.subscription_status === 'past_due';

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

  const refreshUser = async () => {
    try {
      const me = await directus.request(readMe({ fields: ME_FIELDS }));
      setUser(me as DirectusUser);
    } catch {
      // Not logged in (or the request failed) — leave the existing user
      // state as-is rather than signing them out over a flaky refresh.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPaidSupporter,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
