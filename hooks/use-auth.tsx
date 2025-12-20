import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { login as apiLogin, signUp as apiSignUp, resetPassword as apiResetPassword, fetchProfile, logout as apiLogout, loadToken, saveToken } from '@/services/auth';
import { setAccessToken } from '@/services/api';
import { supabase, hasSupabase } from '@/services/supabase';

// REVENUECAT KEYS - GET THESE FROM YOUR DASHBOARD
const REVENUECAT_GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || 'goog_placeholder_key';
// const REVENUECAT_APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;

type AuthContextValue = {
  user: Awaited<ReturnType<typeof fetchProfile>> | null;
  accessToken: string | null;
  initializing: boolean;
  isPremium: boolean; // RevenueCat Status
  login: (identifier: string, password: string) => Promise<void>;
  signUp: (identifier: string, password: string) => Promise<void>;
  resetPassword: (identifier: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  restorePurchases: () => Promise<void>; // Restore Transactions
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  // 1. Initialize RevenueCat
  useEffect(() => {
    const initRevenueCat = async () => {
      if (Platform.OS === 'android') {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey: REVENUECAT_GOOGLE_KEY });
      } else if (Platform.OS === 'ios') {
        // Purchases.configure({ apiKey: REVENUECAT_APPLE_KEY });
      }

      try {
        const info = await Purchases.getCustomerInfo();
        checkPremiumStatus(info);
      } catch (e) {
        // Error fetching customer info (offline or config error)
      }
    };

    initRevenueCat();
  }, []);

  // 2. Check Entitlements
  const checkPremiumStatus = (customerInfo: CustomerInfo) => {
    if (
      customerInfo.entitlements.active['premium_access'] !== undefined
    ) {
      setIsPremium(true);
    } else {
      setIsPremium(false);
    }
  };

  // 3. Listen for real-time updates (purchases made outside the app or subscription renewals)
  useEffect(() => {
    Purchases.addCustomerInfoUpdateListener((info) => {
      checkPremiumStatus(info);
    });
  }, []);

  // Sync RevenueCat ID with Auth ID (Optional but recommended)
  useEffect(() => {
    if (user?.id) {
      Purchases.logIn(user.id);
    } else {
      Purchases.logOut();
    }
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      // Supabase / Auth Logic
      if (hasSupabase && supabase) {
        const { data } = await supabase.auth.getSession();
        const sessionToken = data.session?.access_token;
        if (sessionToken) {
          setToken(sessionToken);
          setAccessToken(sessionToken);
          try {
            const profile = await fetchProfile();
            setUser(profile);
          } catch (e) {
            // ignore profile error
          }
        }
        setInitializing(false);
        return;
      }

      const token = await loadToken();
      if (token) {
        setToken(token);
        setAccessToken(token);
        try {
          const profile = await fetchProfile();
          setUser(profile);
        } catch (e) {
          // Silent fail
        }
      }
      setInitializing(false);
    })();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setAccessToken(data.accessToken);
    await saveToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  };

  const handleSignUp = async (email: string, password: string) => {
    const { user: newUser, session } = await apiSignUp(email, password);
    if (session) {
        setAccessToken(session.access_token);
        await saveToken(session.access_token);
        setToken(session.access_token);
        setUser(newUser);
    }
  };

  const handleResetPassword = async (email: string) => {
    await apiResetPassword(email);
  };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setToken(null);
  };

  const refreshProfile = async () => {
    if (!accessToken) return;
    const profile = await fetchProfile();
    setUser(profile);
  };

  const restorePurchases = async () => {
    try {
      const info = await Purchases.restorePurchases();
      checkPremiumStatus(info);
    } catch (e) {
      // console.error(e);
    }
  };

  const value = useMemo(
    () => ({ 
        user, 
        accessToken, 
        initializing, 
        isPremium,
        login: handleLogin, 
        signUp: handleSignUp,
        resetPassword: handleResetPassword,
        logout: handleLogout, 
        refreshProfile,
        restorePurchases
    }),
    [user, accessToken, initializing, isPremium]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}