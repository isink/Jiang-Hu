import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const extra = (Constants.expoConfig as any)?.extra || {};

const supabaseUrl = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Optional: Listen for AppState changes to handle auth refresh if needed.
  // Guard against duplicate listeners when Fast Refresh re-imports this module.
  const existingListener = (global as any).__supabaseAppStateListener;
  existingListener?.remove?.();

  const appStateListener = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase?.auth.startAutoRefresh();
    } else {
      supabase?.auth.stopAutoRefresh();
    }
  });

  (global as any).__supabaseAppStateListener = appStateListener;
} else {
  if (__DEV__) {
    console.warn(
      '⚠️ Supabase configuration missing!\n' +
      'Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file or app.json extra.\n' +
      'Falling back to mock/local API.'
    );
  }
}

export { supabase };
export const hasSupabase = !!supabase;
