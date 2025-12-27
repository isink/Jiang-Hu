import { wgs84ToGcj02 } from '@/utils/coord-transform';
import { supabase, hasSupabase } from './supabase';
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added for caching

const POI_CACHE_KEY = 'cache_map_pois';

// ... (existing interface)

export async function fetchCorePOIs(onCacheHit?: (data: OSMNode[]) => void): Promise<OSMNode[]> {
  // 1. Try to load from cache immediately
  try {
    const cached = await AsyncStorage.getItem(POI_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (onCacheHit) onCacheHit(data);
      // If we're calling this from Map mount, we might return here 
      // or continue to sync in background.
    }
  } catch (e) {
    // Ignore cache error
  }

  // 2. Fetch from backend
  const pois = await fetchBackendPOIs();
  
  if (pois && pois.length > 0) {
    // 3. Update cache
    AsyncStorage.setItem(POI_CACHE_KEY, JSON.stringify(pois)).catch(() => {});
    return pois;
  }
  
  return pois || [];
}

async function fetchBackendPOIs(): Promise<OSMNode[] | null> {
  try {
    if (hasSupabase && supabase) {
      console.log('🗺️ Fetching POIs from Supabase...');
      const { data, error } = await supabase
        .from('pois')
        .select('id,lat,lon,tags')
        .limit(1000);
        
      if (error) {
        console.warn('Supabase POI Fetch Error:', error.message);
        throw error;
      }

      if (data) {
        console.log(`✅ Loaded ${data.length} POIs from Supabase.`);
        return data.map((item: any) => {
          // Keep WGS-84 to match CartoDB Tiles
          return {
            id: item.id,
            lat: item.lat,
            lon: item.lon,
            tags: item.tags || {},
          };
        });
      }
    }

    // Fallback to our own private API if Supabase is not configured
    const data = await api.get<OSMNode[]>('/map/pois');
    return data.map((item) => ({
      ...item,
      lat: item.lat,
      lon: item.lon,
    }));
  } catch (e) {
    console.warn('Backend POI fetch failed:', e);
    return [];
  }
}

export async function reportPoiIssue(poiId: number | string, payload: { description: string; type?: string }) {
  if (hasSupabase && supabase) {
    const { error } = await supabase.from('poi_reports').insert({
      poi_id: poiId,
      description: payload.description,
      type: payload.type,
    });
    if (error) throw error;
    return;
  }
  return api.post(`/map/pois/${poiId}/report`, payload);
}