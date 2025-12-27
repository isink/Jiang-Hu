import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { supabase, hasSupabase } from './supabase';

export type LocationListItem = {
  id: string;
  title: string;
  category: string;
  tags?: string[];
  imageUrl?: string;
  brief?: string;
  image?: any; // Local asset require() result
};

export type LocationComment = {
  id: string;
  user: { id: string; name: string; avatarUrl?: string };
  text: string;
  rating?: number;
  createdAt?: string;
};

export type LocationDetail = LocationListItem & {
  description?: string;
  tips?: string[];
  transport?: string;
  comments?: LocationComment[];
};

const CACHE_KEYS = {
  LOCATIONS_LIST: 'cache_locations_list',
  LOCATION_DETAIL_PREFIX: 'cache_loc_detail_',
};

/**
 * Offline-First Fetcher
 * 1. Tries to load from cache immediately and calls onCacheHit.
 * 2. Fetches from network.
 * 3. Saves to cache and returns network data.
 */
async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  onCacheHit?: (data: T) => void
): Promise<T> {
  // 1. Try Cache
  let cachedData: T | null = null;
  if (onCacheHit) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        // Attach local assets if needed (re-hydration)
        const hydrated = Array.isArray(data) ? data.map(mapLocationListItem) : data;
        cachedData = hydrated as T;
        onCacheHit(hydrated as T);
      }
    } catch (e) {
      // Ignore cache errors
    }
  }

  // 2. Network Request
  try {
    const data = await fetcher();
    
    // 3. Save Cache (fire and forget)
    AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
    
    return data;
  } catch (error) {
    // If network fails but we had cache, return cache to keep UI stable (Offline Mode)
    if (cachedData) {
      console.warn('Network request failed, using cached data:', error);
      return cachedData;
    }
    // If no cache and no network, then we must throw
    throw error;
  }
}

export async function fetchLocations(onCacheHit?: (data: LocationListItem[]) => void): Promise<LocationListItem[]> {
  return withCache(
    CACHE_KEYS.LOCATIONS_LIST,
    async () => {
      if (hasSupabase && supabase) {
        const { data, error } = await supabase
          .from('locations')
          .select('id,title,category,tags,image_url,brief')
          .order('id');
        if (error) throw error;
        return (data || []).map(mapLocationListItem);
      }
      return api.get('/locations');
    },
    onCacheHit
  );
}

export async function fetchLocationDetail(id: string, onCacheHit?: (data: LocationDetail) => void): Promise<LocationDetail> {
  return withCache(
    `${CACHE_KEYS.LOCATION_DETAIL_PREFIX}${id}`,
    async () => {
      if (hasSupabase && supabase) {
        const { data, error } = await supabase
          .from('locations')
          .select('id,title,category,tags,image_url,brief,description,tips,transport')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        const base = mapLocationListItem(data || { id });

        const { data: commentData, error: commentError } = await supabase
          .from('location_comments')
          .select('id,text,rating,created_at,user_id,user_name,user_avatar')
          .eq('location_id', id)
          .order('created_at', { ascending: false });
        if (commentError) throw commentError;

        return {
          ...base,
          description: (data as any)?.description,
          tips: normalizeList((data as any)?.tips),
          transport: (data as any)?.transport,
          comments: (commentData || []).map(mapComment),
        };
      }
      return api.get(`/locations/${id}`);
    },
    onCacheHit
  );
}

export async function postLocationComment(id: string, payload: { text: string; rating?: number }): Promise<LocationComment> {
  // Comments are dynamic, usually no cache for POST
  if (hasSupabase && supabase) {
    // FIX: Fetch current user metadata to populate user_name
    const { data: { user } } = await supabase.auth.getUser();
    const userName = user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'Traveler';
    const userAvatar = user?.user_metadata?.avatarUrl;

    const insertPayload = {
      location_id: id,
      text: payload.text,
      rating: payload.rating ?? null,
      user_id: user?.id, // Explicitly set user_id if RLS doesn't handle it automatically
      user_name: userName,
      user_avatar: userAvatar
    };
    
    const { data, error } = await supabase
      .from('location_comments')
      .insert(insertPayload)
      .select('id,text,rating,created_at,user_id,user_name,user_avatar')
      .single();
    if (error) throw error;
    return mapComment(data);
  }
  return api.post(`/locations/${id}/comments`, payload);
}

// Local Asset Mapping for Fallback
const LOCAL_ASSETS: Record<string, any> = {
  '01': require('../assets/HONGYA_CAVE.jpg'),
  '02': require('../assets/TANGTZE_CABLEWAY.jpg'),
  '03': require('../assets/LIZIBA_STATION.jpg'),
  '04': require('../assets/RAFFLEA_CITY.jpg'),
  '05': require('../assets/JIEFANGBEI.jpg'),
  '06': require('../assets/KUIXINGLOU.jpg'),
  '07': require('../assets/CIQIKOU_OLD_TOWN.jpg'),
  '08': require('../assets/DAZU_ROCK_CARVINGS.jpg'),
  '09': require('../assets/WULONG_KAEST.jpg'),
  '10': require('../assets/SHIBATI_OLD_STREET.jpg'),
  '11': require('../assets/Bai Xiang Ju.jpg'),
};

const DEFAULT_IMAGE = require('../assets/HUBview.jpg');

function mapLocationListItem(row: any): LocationListItem {
  if (!row) return { id: 'unknown', title: 'Unknown', category: '' };

  const idStr = String(row?.id ?? '').trim();
  // Try to find a numeric version of the ID for matching (e.g. "1" -> "01")
  const numericId = idStr.replace(/[^0-9]/g, '');
  const normalizedId = numericId.padStart(2, '0');
  
  const localImage = LOCAL_ASSETS[idStr] || 
                     LOCAL_ASSETS[normalizedId] || 
                     LOCAL_ASSETS[numericId];
  
  // Clean up imageUrl
  let imageUrl = row?.image_url || row?.imageUrl;
  if (typeof imageUrl === 'string' && (imageUrl.trim() === '' || imageUrl === 'null' || imageUrl === 'undefined')) {
    imageUrl = undefined;
  }

  return {
    id: idStr,
    title: row?.title || row?.name || 'Unknown',
    category: row?.category || '',
    tags: normalizeList(row?.tags),
    imageUrl: imageUrl,
    // Always provide local image as a fallback property if it exists
    image: localImage,
  } as LocationListItem;
}

function mapComment(row: any): LocationComment {
  return {
    id: String(row?.id ?? ''),
    user: {
      id: row?.user_id ? String(row.user_id) : '',
      name: row?.user_name || 'Anonymous',
      avatarUrl: row?.user_avatar,
    },
    text: row?.text || '',
    rating: row?.rating ?? undefined,
    createdAt: row?.created_at,
  };
}

function normalizeList(value: any): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') return value.split('|').map((v) => v.trim()).filter(Boolean);
  return undefined;
}
