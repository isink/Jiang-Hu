import * as SecureStore from 'expo-secure-store';
import { setAccessToken } from './api';
import { supabase, hasSupabase } from './supabase';

export type UserProfile = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  email?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  user: UserProfile;
};

const TOKEN_KEY = 'jianghu.token';

export async function login(email: string, password: string): Promise<LoginResponse> {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const session = data.session;
    if (!session) throw new Error('No session returned');
    const profile = (await fetchProfile()) as UserProfile;
    const token = session.access_token;
    await saveToken(token);
    setAccessToken(token);
    return { accessToken: token, user: profile };
  }

  throw new Error('Supabase is not configured');
}

export async function signUp(email: string, password: string): Promise<{ user: UserProfile | null; session: any }> {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    
    // Auto-login if session exists (Supabase default behavior depends on config)
    if (data.session) {
      const token = data.session.access_token;
      await saveToken(token);
      setAccessToken(token);
    }

    return { 
      user: data.user ? { 
        id: data.user.id, 
        nickname: data.user.email || 'New User',
        email: data.user.email 
      } : null,
      session: data.session 
    };
  }
  throw new Error('Supabase is not configured');
}

export async function resetPassword(email: string): Promise<void> {
  if (hasSupabase && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return;
  }
  throw new Error('Supabase is not configured');
}

export async function fetchProfile(): Promise<UserProfile> {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const user = data.user;
    return {
      id: user?.id || '',
      nickname: user?.user_metadata?.nickname || user?.email || 'User',
      avatarUrl: user?.user_metadata?.avatarUrl,
      email: user?.email || undefined,
    };
  }
  throw new Error('Supabase is not configured');
}

export async function logout() {
  if (hasSupabase && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
  }
  await clearToken();
  setAccessToken(null);
}

export async function saveToken(token: string) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    // Fallback is acceptable; token will remain in memory only
  }
}

export async function loadToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) setAccessToken(token);
    return token;
  } catch (e) {
    return null;
  }
}

export async function clearToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {
    // Ignore storage errors
  }
}
