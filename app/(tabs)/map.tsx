import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator, Linking, Alert } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchCorePOIs, OSMNode } from '@/services/osm';
import { useRouter } from 'expo-router';
import { useHaptics } from '@/hooks/use-haptics';
import { useAuth } from '@/hooks/use-auth';

// Default Region: Chaotianmen, Chongqing (GCJ-02)
const INITIAL_REGION = {
  latitude: 29.5690, // Chaotianmen Latitude
  longitude: 106.5860, // Chaotianmen Longitude
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

// --- HELPER FUNCTIONS (Moved outside to prevent re-creation on every render) ---

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d > 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`;
};

const getMarkerIcon = (tags: OSMNode['tags']) => {
  // 1. CORE LANDMARKS (Tourism) -> Neon Orange
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint' || tags.tourism === 'museum') {
    return { name: 'camera', color: Colors.cyberpunk.neonOrange, bg: '#331100' };
  }

  // 2. VERTICAL TRANSPORT (The Soul of 8D City) -> Gold / Yellow
  if (tags.highway === 'elevator') return { name: 'arrow-up', color: '#FFD700', bg: '#332b00' };
  if (tags.highway === 'steps') return { name: 'footsteps', color: '#FFD700', bg: '#332b00' };
  if (tags.bridge === 'yes') return { name: 'git-merge', color: '#FFD700', bg: '#332b00' };

  // 3. PUBLIC TRANSPORT -> Neon Green
  if (tags.railway === 'subway_entrance' || tags.railway === 'station') {
    return { name: 'subway', color: Colors.cyberpunk.neonGreen, bg: '#002200' };
  }
  if (tags.public_transport) return { name: 'bus', color: Colors.cyberpunk.neonGreen, bg: '#002200' };

  // 4. LIFE & AMENITIES -> Neon Blue / Purple
  if (tags.amenity === 'toilets') return { name: 'male-female', color: Colors.cyberpunk.neonBlue, bg: '#001133' };
  if (tags.amenity === 'bank' || tags.amenity === 'atm') return { name: 'cash', color: '#E040FB', bg: '#220022' };
  if (tags.amenity === 'bar' || tags.amenity === 'cafe' || tags.amenity === 'restaurant') {
    return { name: 'beer', color: '#E040FB', bg: '#220022' };
  }

  return { name: 'location', color: '#888888', bg: '#111111' };
};

const getDisplayName = (tags: OSMNode['tags']) => {
  const en = tags['name:en'];
  const local = tags.name;
  const type = (tags.tourism || tags.amenity || tags.highway || 'Location').replace('_', ' ');

  if (en) return { title: en, subtitle: local };
  if (local) return { title: local, subtitle: type.toUpperCase() };
  return { title: type.toUpperCase(), subtitle: '' };
};

export default function MapScreen() {
  const router = useRouter();
  const { isPremium } = useAuth(); // COMMERCIAL: Check Premium Status
  const haptics = useHaptics();
  const mapRef = useRef<MapView>(null);
  const isMounted = useRef(true);

  const [selectedMarker, setSelectedMarker] = useState<OSMNode | null>(null);
  const [markers, setMarkers] = useState<OSMNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState(INITIAL_REGION);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [userHeading, setUserHeading] = useState<number>(0);
  const [trackingMode, setTrackingMode] = useState<'none' | 'follow' | 'compass'>('none');
  const [status, requestPermission] = Location.useForegroundPermissions();
  // PERFORMANCE: Control marker rendering
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    if (markers.length > 0) {
      setTracksViewChanges(true);
      const timer = setTimeout(() => {
        if (isMounted.current) setTracksViewChanges(false);
      }, 1000); // Allow 1s for markers to render fully before freezing
      return () => clearTimeout(timer);
    }
  }, [markers]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCorePOIs((cachedData) => {
          if (isMounted.current && cachedData?.length) {
              setMarkers(cachedData);
          }
      });

      if (isMounted.current) {
        if (data?.length) {
          setMarkers(data);
        } else {
          // DEBUG: Temporary alert to diagnose empty map
          Alert.alert('Map Debug', 'No data found. Check:\n1. Supabase "pois" table is not empty.\n2. RLS Policies allow read access.');
        }
      }
    } catch (e: any) {
        console.warn('Map data sync failed:', e);
        Alert.alert('Map Error', e?.message || 'Failed to sync data');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []); // Remove dependency on markers.length to avoid any potential loops/re-creations

  // Use refs to access latest state inside listeners without re-binding
  const trackingModeRef = useRef(trackingMode);
  useEffect(() => {
    trackingModeRef.current = trackingMode;
  }, [trackingMode]);

  // 1. DATA LOAD (Run once on mount)
  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => { isMounted.current = false; };
  }, []); // Empty dependencies = Only once

  // 2. LOCATION TRACKING (Separate lifecycle)
  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;
    let isCancelled = false;

    const startTracking = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      if (isCancelled) return;

      // Location Subscription
      const subLoc = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 2,
        },
        (loc) => {
          const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          if (isMounted.current) {
            setUserLocation(newCoords);
          }

          if (trackingModeRef.current !== 'none' && mapRef.current) {
            mapRef.current.animateCamera({ center: newCoords }, { duration: 500 });
          }
        }
      );
      
      if (isCancelled) {
          subLoc.remove();
      } else {
          locationSub = subLoc;
      }

      // Heading Subscription
      const subHead = await Location.watchHeadingAsync((heading) => {
        const h = heading.trueHeading || heading.magHeading;
        if (isMounted.current) {
          setUserHeading(h);
        }

        if (trackingModeRef.current === 'compass' && mapRef.current) {
          mapRef.current.animateCamera({ heading: h }, { duration: 500 });
        }
      });

      if (isCancelled) {
          subHead.remove();
      } else {
          headingSub = subHead;
      }
    };

    startTracking();

    return () => {
      isCancelled = true;
      isMounted.current = false;
      locationSub?.remove();
      headingSub?.remove();
    };
  }, [loadData]);

  const handleLocateMe = async () => {
    haptics.selection();
    
    // COMMERCIAL: PAYWALL CHECK
    if (!isPremium) {
        router.push('/paywall');
        return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied');
      return;
    }

    let newMode: 'follow' | 'compass' = 'follow';
    if (trackingMode === 'none') newMode = 'follow';
    else if (trackingMode === 'follow') newMode = 'compass';
    else if (trackingMode === 'compass') newMode = 'follow';

    setTrackingMode(newMode);

    let location = await Location.getCurrentPositionAsync({});
    // Keep WGS-84
    const { latitude, longitude } = location.coords;

    if (mapRef.current) {
      if (newMode === 'compass') {
        mapRef.current.animateCamera({
          center: { latitude, longitude },
          pitch: 45,
          heading: userHeading,
          zoom: 18,
        });
      } else {
        mapRef.current.animateCamera({
          center: { latitude, longitude },
          pitch: 0,
          heading: 0,
          zoom: 16,
        });
      }
    }
  };

  const handleInitiateRoute = () => {
    haptics.heavy();
    if (!selectedMarker) return;

    const { lat, lon } = selectedMarker;
    const rawLabel = selectedMarker.tags['name:en'] || selectedMarker.tags.name || 'Destination';
    const label = encodeURIComponent(rawLabel);
    const coords = `${encodeURIComponent(String(lat))},${encodeURIComponent(String(lon))}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${coords}`,
      android: `geo:0,0?q=${coords}(${label})`,
    });

    if (url) {
      Linking.openURL(url).catch((err) => console.error('An error occurred', err));
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation={false} // Custom user marker
        showsMyLocationButton={false}
        onPanDrag={() => setTrackingMode('none')} // Stop tracking on user gesture
        onRegionChangeComplete={(reg) => {
          setRegion(reg);
        }}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
      >
        <UrlTile
          urlTemplate="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />

        {/* Custom User Marker (Pointer) */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }} // Center the rotation
            zIndex={999} // Always on top
          >
            <View style={{
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate: `${userHeading}deg` }]
            }}>
                <View style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: 'rgba(57, 255, 20, 0.3)', // Glow
                    transform: [{ scale: 1.5 }]
                }} />
                <Ionicons name="navigate" size={24} color={Colors.cyberpunk.neonGreen} />
            </View>
          </Marker>
        )}

        {markers.map((marker) => {
          const { name, color, bg } = getMarkerIcon(marker.tags);
          return (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.lat, longitude: marker.lon }}
              onPress={() => {
                  haptics.light(); // Feedback on marker tap
                  setSelectedMarker(marker);
              }}
              tracksViewChanges={tracksViewChanges}
            >
              <View style={[styles.markerCircle, { backgroundColor: bg, borderColor: color }]}>
                 <Ionicons name={name as any} size={14} color={color} />
              </View>
            </Marker>
          );
        })}
      </MapView>
      
      {/* Floating Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
            style={[
              styles.controlBtn, 
              trackingMode !== 'none' && { backgroundColor: Colors.cyberpunk.neonOrange, borderColor: Colors.cyberpunk.neonOrange }
            ]} 
            onPress={handleLocateMe}
        >
            {!isPremium ? (
                 <Ionicons name="lock-closed" size={16} color="black" />
            ) : (
            <Ionicons 
              name={trackingMode === 'compass' ? 'compass' : (trackingMode === 'follow' ? 'navigate' : 'locate')} 
              size={20} 
              color="black" 
            />
            )}
        </TouchableOpacity>
      </View>

      {/* Selected Marker Popup */}
      {selectedMarker && (
        <View style={styles.bottomSheet}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setSelectedMarker(null)}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerBadges}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>
                  {(selectedMarker.tags.tourism || selectedMarker.tags.amenity || selectedMarker.tags.highway || 'LOCATION').toUpperCase().replace('_', ' ')}
              </Text>
            </View>
            
            {userLocation && (
              <View style={[styles.badgeContainer, { backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: '#333' }]}>
                <Ionicons name="navigate-circle" size={12} color={Colors.cyberpunk.neonGreen} style={{marginRight: 4}} />
                <Text style={[styles.badgeText, { color: Colors.cyberpunk.neonGreen }]}>
                  {calculateDistance(userLocation.latitude, userLocation.longitude, selectedMarker.lat, selectedMarker.lon)}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.sheetTitle}>
            {getDisplayName(selectedMarker.tags).title}
          </Text>
          <Text style={styles.sheetSubtitle}>
            {getDisplayName(selectedMarker.tags).subtitle}
          </Text>
          
          <Text style={styles.sheetDesc}>
            Located at {selectedMarker.lat.toFixed(4)}, {selectedMarker.lon.toFixed(4)}. 
            Feature: {Object.keys(selectedMarker.tags).filter(k => !k.startsWith('name') && !k.startsWith('source')).slice(0, 3).join(', ')}.
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleInitiateRoute}>
               <Ionicons name="navigate" size={16} color="black" style={{marginRight:5}} />
               <Text style={styles.primaryBtnText}>INITIATE ROUTE</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.secondaryBtn}
                onPress={() => {
                    haptics.selection();
                    if (!selectedMarker) return;
                    const name = selectedMarker.tags['name:en'] || selectedMarker.tags.name || 'Unknown';
                    router.push({
                        pathname: '/modal',
                        params: { poiId: selectedMarker.id, poiName: name }
                    });
                }}
            >
               <Ionicons name="chatbubble-ellipses-outline" size={16} color="white" style={{marginRight:5}} />
               <Text style={styles.secondaryBtnText}>REPORT ISSUE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    // borderColor is dynamic now
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 110, // Above tab bar
    left: 20,
    right: 20,
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  badgeContainer: {
    backgroundColor: '#FFD700',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sheetTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sheetDesc: {
    color: '#CCC',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.cyberpunk.neonGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 4,
  },
  primaryBtnText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: '#555',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 4,
  },
  secondaryBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  controlsContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    alignItems: 'center',
    gap: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#39FF14',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'black',
  },
});