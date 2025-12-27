import { api } from './api';
import { UserProfile } from './auth';
import { supabase, hasSupabase } from './supabase';

import AsyncStorage from '@react-native-async-storage/async-storage'; // Added import

// ... (existing imports)

export type Favorite = {
  id: string; // Location ID
  addedAt: number;
};

const FAVORITES_KEY = 'jianghu_favorites';

export async function fetchFavorites(): Promise<Favorite[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function addFavorite(locationId: string): Promise<void> {
  const current = await fetchFavorites();
  if (current.some(f => f.id === locationId)) return; // Already exists
  
  const newList = [...current, { id: locationId, addedAt: Date.now() }];
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newList));
}

export async function removeFavorite(locationId: string): Promise<void> {
  const current = await fetchFavorites();
  const newList = current.filter(f => f.id !== locationId);
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newList));
}

export async function checkFavoriteLimit(limit: number): Promise<boolean> {
  const current = await fetchFavorites();
  return current.length < limit;
}

// ... (rest of the existing code)

export type Phrase = {
  id: string;
  en: string;
  cn: string;
  py?: string;
};

export async function updateProfile(payload: Partial<Pick<UserProfile, 'nickname' | 'avatarUrl'>>) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        nickname: payload.nickname,
        avatarUrl: payload.avatarUrl,
      },
    });
    if (error) throw error;
    const user = data.user;
    return {
      id: user?.id || '',
      nickname: user?.user_metadata?.nickname || user?.email || 'User',
      avatarUrl: user?.user_metadata?.avatarUrl,
      email: user?.email || undefined,
    };
  }
  return api.patch<UserProfile>('/me', payload);
}

export async function fetchPhrases(): Promise<Phrase[]> {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('phrases')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((item: any) => ({
        id: item.id,
        en: item.en || '',
        cn: item.cn || item.zh || item.chinese || item.translation || '',
        py: item.py || ''
    }));
  }
  return api.get('/phrases');
}

export async function createPhrase(phrase: Omit<Phrase, 'id'>): Promise<Phrase> {
  if (hasSupabase && supabase) {
    const payload = {
      original_text: phrase.en,
      translated_text: phrase.cn,
    };

    const { data, error } = await supabase
      .from('phrases')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    return {
      id: data.id,
      en: data.original_text || '',
      cn: data.translated_text || '',
      py: data.py,
    };
  }
  return api.post('/phrases', phrase);
}

export async function deletePhrase(id: string) {
  if (hasSupabase && supabase) {
    const { error } = await supabase.from('phrases').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  return api.del(`/phrases/${id}`);
}

export async function fetchRate(from = 'CNY', to = 'USD'): Promise<{ rate: number; date?: string }> {
  // Try backend first, fallback to public API
  try {
    const data = await api.get<{ rate: number; date?: string }>(`/rates?from=${from}&to=${to}`);
    return data;
  } catch (e) {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    const json = await res.json();
    return { rate: json?.rates?.[to] || 0, date: json?.date };
  }
}
