import { BACKEND_API_URL } from '@/constants/backendApiUrl';
import { directus } from '@/lib/directus';
import { passwordRequest, readMe } from '@directus/sdk';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface DirectusUser {
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
  // Staff and admins (checked by the website, which can see roles) — they
  // get everything a paid supporter does, without a subscription.
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    newsletter: boolean,
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  // Re-pulls the current user (e.g. subscription_status) without a full
  // sign-in — used after returning from the website's Stripe checkout, so
  // the account screen reflects a new subscription immediately. Returns the
  // freshly-fetched user so callers can act on the up-to-date status right
  // away, without waiting a render cycle for `user`/`isPaidSupporter` to
  // catch up.
  refreshUser: () => Promise<DirectusUser | null>;
}

// Must match the website, which stores every account email lowercased.
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function isPaidSupporterStatus(status?: string | null) {
  return status === 'active' || status === 'past_due';
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isPaidSupporter: false,
  isStaff: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => { },
  resetPassword: async () => ({ error: null }),
  refreshUser: async () => null,
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
  const [isStaff, setIsStaff] = useState(false);
  const isPaidSupporter =
    isStaff || isPaidSupporterStatus(user?.subscription_status);

  // A failed lookup just means no staff perks, never a broken login.
  const loadStaffStatus = async () => {
    try {
      const token = await directus.getToken();
      if (!token) {
        setIsStaff(false);
        return;
      }
      const response = await fetch(`${BACKEND_API_URL}/api/auth/is-staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setIsStaff(response.ok && data.isStaff === true);
    } catch {
      setIsStaff(false);
    }
  };

  useEffect(() => {
    // Restore session from stored token
    directus
      .request(readMe({ fields: ME_FIELDS }))
      .then((me) => {
        setUser(me as DirectusUser);
        return loadStaffStatus();
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (rawEmail: string, password: string) => {
    const email = normalizeEmail(rawEmail);
    try {
      await directus.login({ email, password });
      const me = await directus.request(readMe({ fields: ME_FIELDS }));
      setUser(me as DirectusUser);
      await loadStaffStatus();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (
    rawEmail: string,
    password: string,
    username: string,
    newsletter: boolean,
  ) => {
    const email = normalizeEmail(rawEmail);
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, newsletter }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: new Error(data.error || 'Could not create your account') };
      }

      // Account now exists — sign in the normal way.
      await directus.login({ email, password });
      const me = await directus.request(readMe({ fields: ME_FIELDS }));
      setUser(me as DirectusUser);
      await loadStaffStatus();
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
    setIsStaff(false);
  };

  const resetPassword = async (rawEmail: string) => {
    const email = normalizeEmail(rawEmail);
    try {
      // reset_url so the emailed link lands on the website's own
      // /reset-password page, not Directus's admin app
      await directus.request(passwordRequest(email, `${BACKEND_API_URL}/reset-password`));
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const refreshUser = async () => {
    try {
      const me = (await directus.request(readMe({ fields: ME_FIELDS }))) as DirectusUser;
      setUser(me);
      return me;
    } catch {
      // Not logged in (or the request failed) — leave the existing user
      // state as-is rather than signing them out over a flaky refresh.
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPaidSupporter,
        isStaff,
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
