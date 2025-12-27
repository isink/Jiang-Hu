import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fetchLocations, LocationListItem } from '@/services/locations';
import { useHaptics } from '@/hooks/use-haptics';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '@/hooks/use-auth';

// COMMERCIAL: Define Ad Item Type
type AdItem = { type: 'AD'; id: string };
type ListItem = LocationListItem | AdItem;

const FALLBACK_LOCATIONS: (LocationListItem & { image?: any })[] = [
  { id: '01', title: 'HONGYA CAVE', category: 'SIGHTSEEING', tags: ['#CYBERPUNK', '#NIGHT'], image: require('../../assets/HONGYA_CAVE.jpg') },
  { id: '02', title: 'YANGTZE CABLEWAY', category: 'TRANSPORT', tags: ['#ICONIC', '#RIVER'], image: require('../../assets/TANGTZE_CABLEWAY.jpg') },
  { id: '03', title: 'LIZIBA STATION', category: 'TRANSPORT', tags: ['#TRAIN', '#VIRAL'], image: require('../../assets/LIZIBA_STATION.jpg') },
  { id: '04', title: 'RAFFLES CITY', category: 'ARCHITECTURE', tags: ['#FUTURE', '#SAIL'], image: require('../../assets/RAFFLEA_CITY.jpg') },
  { id: '05', title: 'JIEFANGBEI CBD', category: 'URBAN', tags: ['#SHOPPING', '#LANDMARK'], image: require('../../assets/JIEFANGBEI.jpg') },
  { id: '06', title: 'KUIXINGLOU', category: 'URBAN', tags: ['#22ND_FLOOR', '#8D_CITY'], image: require('../../assets/KUIXINGLOU.jpg') },
  { id: '07', title: 'CIQIKOU OLD TOWN', category: 'CULTURE', tags: ['#HISTORY', '#FOOD'], image: require('../../assets/CIQIKOU_OLD_TOWN.jpg') },
  { id: '08', title: 'DAZU ROCK CARVINGS', category: 'HERITAGE', tags: ['#UNESCO', '#ART'], image: require('../../assets/DAZU_ROCK_CARVINGS.jpg') },
  { id: '09', title: 'WULONG KARST', category: 'NATURE', tags: ['#TRANSFORMERS'], image: require('../../assets/WULONG_KAEST.jpg') },
  { id: '10', title: 'SHIBATI OLD STREET', category: 'CULTURE', tags: ['#MEMORY', '#RETRO'], image: require('../../assets/SHIBATI_OLD_STREET.jpg') },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// --- OPTIMIZED SUB-COMPONENTS ---

const AdCard = React.memo(() => {
    const router = useRouter();
    return (
        <AnimatedTouchable 
            entering={FadeInDown.duration(500)}
            style={[styles.card, styles.adCard]} 
            activeOpacity={0.9}
            onPress={() => router.push('/paywall')}
        >
            <View style={styles.adImagePlaceholder}>
                <Ionicons name="megaphone-outline" size={32} color="#444" />
                <View style={styles.adBadge}>
                    <Text style={styles.adBadgeText}>SPONSORED</Text>
                </View>
            </View>
            <View style={styles.adContent}>
                <Text style={styles.adTitle}>PROMOTED CONTENT</Text>
                <Text style={styles.adDesc} numberOfLines={2}>
                    Discover regional benefits and exclusive rewards. This data stream is supported by our sponsors.
                </Text>
                <TouchableOpacity style={styles.adAction} onPress={() => router.push('/paywall')}>
                    <Text style={styles.adActionText}>REMOVE ADS // UPGRADE</Text>
                </TouchableOpacity>
            </View>
        </AnimatedTouchable>
    );
});

const LocationCard = React.memo(({ item, index }: { item: LocationListItem, index: number }) => {
    const router = useRouter();
    const haptics = useHaptics();
    
    // Only animate the first 10 items to prevent scrolling lag
    const animated = index < 10;
    
    const content = (
        <View style={styles.card}>
            <View style={styles.cardImageContainer}>
                <Image 
                    source={item.image ? item.image : item.imageUrl ? { uri: item.imageUrl } : require('../../assets/HUBview.jpg')} 
                    style={styles.cardImage} 
                    contentFit="cover"
                    transition={200} // Reduced transition time for snappier feel
                    cachePolicy="memory-disk"
                />
                <View style={styles.cardOverlay} />
                <Text style={styles.cardId}>{item.id}</Text>
            </View>
            <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardCategory}>{item.category}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2} adjustsFontSizeToFit>{item.title}</Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardTags}>{Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags as any)}</Text>
                    <Ionicons name="arrow-forward" size={20} color={Colors.cyberpunk.text} />
                </View>
            </View>
        </View>
    );

    const handlePress = useCallback(() => {
        haptics.light();
        router.push(`/location/${item.id}`);
    }, [item.id, haptics, router]);

    if (animated) {
        return (
            <AnimatedTouchable 
                entering={FadeInDown.delay(index * 50).duration(400).springify()}
                activeOpacity={0.8}
                onPress={handlePress}
            >
                {content}
            </AnimatedTouchable>
        );
    }

    return (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handlePress}
        >
            {content}
        </TouchableOpacity>
    );
});

export default function HomeScreen() {
  const router = useRouter();
  const { isPremium } = useAuth(); // COMMERCIAL: Check Status
  const [locations, setLocations] = useState<LocationListItem[]>(FALLBACK_LOCATIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // COMMERCIAL: Inject Ads into Feed
  const feedData = useMemo(() => {
    if (isPremium) return locations;
    
    const mixedList: ListItem[] = [];
    locations.forEach((item, index) => {
        mixedList.push(item);
        // Inject AD after every 4th item
        if ((index + 1) % 4 === 0) {
            mixedList.push({ type: 'AD', id: `ad-${index}` });
        }
    });
    return mixedList;
  }, [locations, isPremium]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchLocations((cachedData) => {
            if (mounted && cachedData?.length) {
                setLocations(cachedData);
            }
        });
        if (mounted && data?.length) {
          setLocations(data);
          setError('');
        }
      } catch (e: any) {
        if (mounted) {
             setError(e?.message || '离线模式');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.logoText}>
            JIANG<Text style={{color: Colors.cyberpunk.neonOrange}}>/</Text>HU
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, isPremium && { borderColor: Colors.cyberpunk.neonGreen }]}>
            <View style={[styles.statusDot, isPremium && { backgroundColor: Colors.cyberpunk.neonGreen }]} />
            <Text style={[styles.statusText, isPremium && { color: Colors.cyberpunk.neonGreen }]}>
                {isPremium ? 'SYSTEM OPTIMIZED' : 'SIGNAL INTERFERENCE'}
            </Text>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>EXPLORE</Text>
          <Text style={styles.mainTitle}>THE 8D CITY</Text>
          <View style={styles.underline} />
        </View>

        <Text style={styles.subtitle}>
          Navigate the cyberpunk labyrinth.{'\n'}
          Discover hidden gems in the fog.
        </Text>

        <View style={styles.databaseHeader}>
          <Text style={styles.databaseTitle}>LOCATION DATABASE</Text>
          <View style={styles.databaseLine} />
          <Text style={styles.databaseCount}>{locations.length}</Text>
        </View>

        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <ActivityIndicator size="small" color={Colors.cyberpunk.neonGreen} />
            <Text style={{ color: Colors.cyberpunk.textDim }}>Syncing data...</Text>
          </View>
        )}
        {!!error && (
          <Text style={{ color: Colors.cyberpunk.neonOrange, marginBottom: 8 }}>{error}</Text>
        )}
    </View>
  );

  const renderItem = useCallback(({ item, index }: { item: ListItem, index: number }) => {
    if ('type' in item && item.type === 'AD') {
        return <AdCard />;
    }
    return <LocationCard item={item as LocationListItem} index={index} />;
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/HUBview.jpg')} 
        style={styles.background} 
        contentFit="cover"
      />
      
      <FlashList<ListItem>
        data={feedData}
        renderItem={renderItem}
        // @ts-ignore
        estimatedItemSize={120}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{height: 15}} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cyberpunk.darkBg,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100, // Space for tab bar
  },
  headerContainer: {
    marginBottom: 0,
  },
  header: {
    marginBottom: 40,
  },
  // ... (keep existing styles)
  logoText: {
    color: Colors.cyberpunk.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  statusContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cyberpunk.neonGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cyberpunk.neonGreen,
    marginRight: 8,
  },
  statusText: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  titleContainer: {
    marginBottom: 20,
  },
  mainTitle: {
    color: Colors.cyberpunk.text,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
    letterSpacing: -1,
  },
  underline: {
    width: 60,
    height: 4,
    backgroundColor: Colors.cyberpunk.neonOrange,
    marginTop: 20,
  },
  subtitle: {
    color: Colors.cyberpunk.textDim,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 40,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  databaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  databaseTitle: {
    color: Colors.cyberpunk.textDim,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginRight: 10,
  },
  databaseLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
    marginRight: 10,
  },
  databaseCount: {
    color: Colors.cyberpunk.textDim,
    fontSize: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.cyberpunk.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    height: 120,
    overflow: 'hidden',
  },
  cardImageContainer: {
    width: 120,
    height: '100%',
    backgroundColor: '#222',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardId: {
    position: 'absolute',
    top: 8,
    left: 8,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCategory: {
    color: Colors.cyberpunk.textDim,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  cardTitle: {
    color: Colors.cyberpunk.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTags: {
    color: '#555',
    fontSize: 10,
  },
  adCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: '#222',
  },
  adImagePlaceholder: {
    width: 120,
    height: '100%',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  adBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#444',
  },
  adBadgeText: {
    color: '#888',
    fontSize: 8,
    fontWeight: 'bold',
  },
  adContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  adTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 1,
  },
  adDesc: {
    color: '#555',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  adAction: {
    alignSelf: 'flex-start',
  },
  adActionText: {
    color: Colors.cyberpunk.neonOrange,
    fontSize: 10,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
