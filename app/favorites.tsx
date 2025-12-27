import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchLocationDetail, LocationDetail } from '@/services/locations';
import { fetchFavorites, Favorite } from '@/services/user';
import { useHaptics } from '@/hooks/use-haptics';
import { BlurView } from 'expo-blur';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function FavoritesScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const [favorites, setFavorites] = useState<LocationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
        const favIds = await fetchFavorites();
        if (favIds.length === 0) {
            setFavorites([]);
            return;
        }

        // Fetch details for each favorite
        // In a real app, you might have a bulk fetch endpoint or store minimal details in AsyncStorage
        // Here we fetch details one by one or rely on cache
        const details = await Promise.all(
            favIds.map(f => fetchLocationDetail(f.id))
        );
        setFavorites(details);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const renderHeader = () => (
    <View style={styles.header}>
        <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>MEMORY STASH</Text>
        </View>
        <Text style={styles.subtitle}>{favorites.length} DATA FRAGMENTS SAVED</Text>
    </View>
  );

  const renderItem = ({ item: loc, index }: { item: LocationDetail, index: number }) => {
    // Only animate the first few items for performance
    const animated = index < 10;
    
    const content = (
        <View style={styles.card}>
            <View style={styles.cardImageContainer}>
                <Image 
                    source={(loc as any).image ? (loc as any).image : loc.imageUrl ? { uri: loc.imageUrl } : require('../assets/HUBview.jpg')} 
                    style={styles.cardImage} 
                    contentFit="cover"
                />
                <View style={styles.cardOverlay} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{loc.title}</Text>
                <Text style={styles.cardCategory}>{loc.category}</Text>
                <View style={styles.cardFooter}>
                    <Ionicons name="bookmark" size={14} color={Colors.cyberpunk.neonGreen} />
                    <Text style={styles.savedLabel}>SAVED</Text>
                </View>
            </View>
        </View>
    );

    if (animated) {
        return (
            <AnimatedTouchable 
                entering={FadeInDown.delay(index * 50).duration(400)}
                activeOpacity={0.8}
                onPress={() => {
                    haptics.light();
                    router.push(`/location/${loc.id}`);
                }}
            >
                {content}
            </AnimatedTouchable>
        );
    }

    return (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
                haptics.light();
                router.push(`/location/${loc.id}`);
            }}
        >
            {content}
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      
      {loading ? (
          <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.cyberpunk.neonGreen} />
          </View>
      ) : favorites.length === 0 ? (
          <View style={styles.center}>
              <Ionicons name="file-tray-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>NO DATA FRAGMENTS</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)')}>
                  <Text style={styles.exploreText}>EXPLORE THE CITY</Text>
              </TouchableOpacity>
          </View>
      ) : (
          <FlashList<LocationDetail>
            data={favorites}
            renderItem={renderItem}
            // @ts-ignore
            estimatedItemSize={100}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{height: 15}} />}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.cyberpunk.darkBg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
    marginLeft: 44, // Align with title
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    height: 100,
    overflow: 'hidden',
  },
  cardImageContainer: {
    width: 100,
    height: '100%',
    backgroundColor: '#222',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardCategory: {
    color: '#888',
    fontSize: 10,
    marginBottom: 10,
    letterSpacing: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedLabel: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#555',
    marginTop: 20,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  exploreBtn: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.cyberpunk.neonGreen,
    borderRadius: 8,
  },
  exploreText: {
    color: Colors.cyberpunk.neonGreen,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
