import { directus } from '@/lib/directus';
import { createUser, passwordRequest, readMe } from '@directus/sdk';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface DirectusUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: DirectusUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DirectusUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from stored token
    directus
      .request(readMe())
      .then((me) => setUser(me as DirectusUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await directus.login({ email, password });
      const me = await directus.request(readMe());
      setUser(me as DirectusUser);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await directus.request(createUser({ email, password }));
      // Auto sign in after registration
      await directus.login({ email, password });
      const me = await directus.request(readMe());
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
