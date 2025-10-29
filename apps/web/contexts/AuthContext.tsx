"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { API_BASE } from '@/lib/env';
import LoginModal from '@/components/auth/LoginModal';

export type AuthUserProvider = {
  provider: string;
  provider_user_id: string;
  linked_at: string;
};

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  level: number;
  points: number;
  provider: string | null;
  last_login_at?: string | null;
  is_email_verified?: boolean;
  providers?: AuthUserProvider[];
};

export type AuthProviderInfo = {
  id: string;
  name: string;
  type: 'oauth' | 'gis';
  login_url?: string;
  client_id?: string;
  ux_mode?: 'popup' | 'redirect';
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  providers: AuthProviderInfo[];
  refreshUser: () => Promise<void>;
  openLogin: (redirectTo?: string) => void;
  loginWithOAuth: (provider: string, redirectTo?: string) => void;
  logout: (redirectTo?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`${response.status}`);
  }
  return (await response.json()) as T;
}

const DEFAULT_GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const DEFAULT_PROVIDERS: AuthProviderInfo[] = [
  { id: 'google', name: 'Google', type: 'gis', client_id: DEFAULT_GOOGLE_CLIENT_ID },
  { id: 'github', name: 'GitHub', type: 'oauth', login_url: `${API_BASE}/api/auth/login/github` },
];

function resolveLoginUrl(baseUrl: string, providerId: string, info?: AuthProviderInfo) {
  const rawUrl = info?.login_url ?? `${baseUrl}/api/auth/login/${providerId}`;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }
  return `${baseUrl.replace(/\/$/, '')}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [providers, setProviders] = useState<AuthProviderInfo[]>([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginRedirect, setLoginRedirect] = useState<string | null>(null);
  const [loginProcessing, setLoginProcessing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<AuthUser>(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
      });
      setUser(data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ providers: AuthProviderInfo[] }>(`${API_BASE}/api/auth/providers`, {
      credentials: 'include',
    })
      .then((data) => {
        if (!cancelled) {
          setProviders(data.providers);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProviders([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const providerList = useMemo<AuthProviderInfo[]>(() => (
    providers.length ? providers : DEFAULT_PROVIDERS
  ), [providers]);

  const openLogin = useCallback((redirectTo?: string) => {
    const currentLocation = typeof window !== 'undefined' ? window.location.href : null;
    setLoginRedirect(redirectTo ?? currentLocation);
    setLoginError(null);
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
    setLoginProcessing(false);
    setLoginError(null);
    setLoginRedirect(null);
  }, []);

  const loginWithOAuth = useCallback((providerId: string, redirectTo?: string) => {
    const providerInfo = providerList.find((item) => item.id === providerId && item.type === 'oauth');
    const currentLocation = typeof window !== 'undefined' ? window.location.href : undefined;
    const target = redirectTo ?? loginRedirect ?? currentLocation;
    const loginUrl = new URL(resolveLoginUrl(API_BASE, providerId, providerInfo));
    if (target) {
      loginUrl.searchParams.set('redirect_to', target);
    }
    setIsLoginOpen(false);
    setLoginError(null);
    setLoginProcessing(false);
    if (typeof window !== 'undefined') {
      window.location.href = loginUrl.toString();
    }
  }, [providerList, loginRedirect]);

  const clearLoginError = useCallback(() => {
    setLoginError(null);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setLoginProcessing(true);
    setLoginError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/google/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: credential }),
      });
      if (!response.ok) {
        throw new Error(`Google verify failed with status ${response.status}`);
      }
      const payload = await response.json() as { user: AuthUser };
      setUser(payload.user);
      setLoading(false);
      const redirectTarget = loginRedirect;
      setIsLoginOpen(false);
      setLoginRedirect(null);
      if (redirectTarget) {
        window.location.href = redirectTarget;
      }
    } catch (error) {
      console.error('Google sign-in failed', error);
      setLoginError('Unable to sign in with Google. Please try again.');
      throw error;
    } finally {
      setLoginProcessing(false);
    }
  }, [loginRedirect]);

  const logout = useCallback(async (redirectTo?: string) => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      // swallow network errors, user session is cleared by cookie deletion
    } finally {
      setUser(null);
      setLoading(false);
      if (redirectTo) {
        window.location.href = redirectTo;
      }
    }
  }, []);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    loading,
    providers: providerList,
    refreshUser,
    openLogin,
    loginWithOAuth,
    logout,
  }), [user, loading, providerList, refreshUser, openLogin, loginWithOAuth, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <LoginModal
        isOpen={isLoginOpen}
        providers={providerList}
        isProcessing={loginProcessing}
        error={loginError}
        onClose={closeLogin}
        onClearError={clearLoginError}
        onGoogleCredential={loginWithGoogle}
        onOAuthClick={loginWithOAuth}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
