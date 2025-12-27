import { wgs84ToGcj02 } from '@/utils/coord-transform';
import { supabase, hasSupabase } from './supabase';
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added for caching

const POI_CACHE_KEY = 'cache_map_pois';

// Node Interface
export type OSMNode = {
  id: string | number;
  lat: number;
  lon: number;
  tags: { [key: string]: string };
};

export async function fetchCorePOIs(onCacheHit?: (data: OSMNode[]) => void): Promise<OSMNode[]> {
  // 1. Try to load from cache immediately
  try {
    const cached = await AsyncStorage.getItem(POI_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data && data.length > 0) {
        if (onCacheHit) onCacheHit(data);
        // We still fetch fresh data in background if cache exists
      }
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
      
      // 1. Fetch from specific POIs table (Map markers)
      const { data: poisData, error: poisError } = await supabase
        .from('pois')
        .select('id,lat,lon,tags')
        .limit(1000);
        
      if (poisError) {
        console.warn('Supabase POI Fetch Error:', poisError.message);
      }

      // 2. Fetch from Locations table (Guide content) - ARCHITECTURAL FIX
      // We assume locations table might have lat/lon. If not, this is a graceful fallback.
      const { data: locsData, error: locsError } = await supabase
        .from('locations')
        .select('id,title,category,lat,lon,tags') // Ensure these columns exist in your DB or this will be ignored
        .not('lat', 'is', null)
        .not('lon', 'is', null);

      if (locsError) {
          console.warn('Supabase Locations Fetch Error (Map):', locsError.message);
      }

      // 3. Merge Data
      const combined: OSMNode[] = [];

      if (poisData) {
        poisData.forEach((item: any) => {
          combined.push({
            id: item.id,
            lat: item.lat,
            lon: item.lon,
            tags: item.tags || {},
          });
        });
      }

      if (locsData) {
        locsData.forEach((item: any) => {
            // Prevent duplicates if IDs overlap (unlikely but safe)
            if (!combined.find(p => String(p.id) === String(item.id))) {
                combined.push({
                    id: String(item.id),
                    lat: item.lat,
                    lon: item.lon,
                    tags: {
                        name: item.title,
                        amenity: item.category === 'FOOD' ? 'restaurant' : 'point_of_interest', // Simple mapping
                        tourism: 'attraction',
                        ...(item.tags || {})
                    }
                });
            }
        });
      }

      if (combined.length > 0) {
        console.log(`✅ Loaded ${combined.length} Total POIs from Supabase.`);
        return combined;
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
