import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchLocationDetail, LocationDetail, LocationComment, postLocationComment } from '@/services/locations';
import { useAuth } from '@/hooks/use-auth';
import { addFavorite, removeFavorite, fetchFavorites, checkFavoriteLimit } from '@/services/user';

const { width } = Dimensions.get('window');

// Data Source (fallback when API not available)
const LOCATION_DETAILS: Record<string, LocationDetail & { image?: any }> = {
  '01': {
    id: '01',
    category: 'SIGHTSEEING',
    title: 'HONGYA CAVE',
    description: "A real-life 'Spirited Away' bathhouse. This 11-story stilt house complex clings to a cliffside along the Jialing River. A masterpiece of Bayu architecture, it's a vertical maze of shops, bars, and restaurants.",
    tips: [
      "Best View: Qiansimen Bridge or across the river.",
      "Lights on: Approx 19:30 - 23:00.",
      "Crowd Alert: Extremely busy on holidays. 11th floor is street level!"
    ],
    transport: "Metro Line 1 or 6 to Xiaoshizi Station (Exit 6 or 9). Walk 10 mins towards the river.",
    comments: [
      { id: 'c1', user: { id: 'u1', name: "Cyber_Punk" }, text: "The night view is insane. Total cyberpunk vibes.", rating: 5 },
      { id: 'c2', user: { id: 'u2', name: "Traveler_99" }, text: "Don't trust the elevators, take the stairs!", rating: 4 },
    ],
    image: require('../../assets/HONGYA_CAVE.jpg'),
  },
  '02': {
    id: '02',
    category: 'TRANSPORT',
    title: 'YANGTZE CABLEWAY',
    description: "The 'Air Bus' of Chongqing. Gliding across the Yangtze River, this cableway offers a retro, cinematic view of the city's skyline and the muddy river below.",
    tips: [
      "Sunset is the golden hour.",
      "Start from the South Bank (Shangxin Jie) to avoid long queues at Jiefangbei.",
      "Book tickets online in advance."
    ],
    transport: "North Station: Metro Line 1/6 to Xiaoshizi (Exit 5B). South Station: Metro Line 6 to Shangxin Jie.",
    comments: [
      { id: 'c3', user: { id: 'u3', name: "Sky_Walker" }, text: "Classic movie scene. Short but memorable.", rating: 4 },
    ],
    image: require('../../assets/TANGTZE_CABLEWAY.jpg'),
  },
  '03': {
    id: '03',
    category: 'TRANSPORT',
    title: 'LIZIBA STATION',
    description: "The viral 'Train Eating Building'. Line 2 passes straight through a 19-story residential building. A testament to Chongqing's 8D topography and engineering ingenuity.",
    tips: [
      "Viewing Platform: Exit at Liziba Station, go down to street level.",
      "Best time: Morning for better lighting.",
      "Don't miss the ride *inside* the train too."
    ],
    transport: "Metro Line 2 to Liziba Station. Take Exit A and walk down to the viewing deck.",
    comments: [
      { id: 'c4', user: { id: 'u4', name: "Rail_Fan" }, text: "Engineering marvel. Only in Chongqing.", rating: 5 },
    ],
    image: require('../../assets/LIZIBA_STATION.jpg'),
  },
  '04': {
    id: '04',
    category: 'ARCHITECTURE',
    title: 'RAFFLES CITY',
    description: "The 'Crystal' sail. A futuristic mega-structure at Chaotianmen, where the two rivers meet. It features a horizontal sky conservatory connecting four towers.",
    tips: [
      "The Exploration Deck offers a glass-bottom view.",
      "Great spot for sunset photos of the river confluence.",
      "Connects to Chaotianmen Square below."
    ],
    transport: "Metro Line 1 to Chaotianmen Station. Direct access to the mall.",
    comments: [
      { id: 'c5', user: { id: 'u5', name: "Future_City" }, text: "Looks like a spaceship landed.", rating: 5 },
    ],
    image: require('../../assets/RAFFLEA_CITY.jpg'),
  },
  '05': {
    id: '05',
    category: 'URBAN',
    title: 'JIEFANGBEI CBD',
    description: "The spiritual and commercial heart of Chongqing. The Liberation Monument stands tall amidst a forest of skyscrapers, luxury malls, and neon lights.",
    tips: [
      "Visit at night for the neon glow.",
      "Food street nearby (Bayi Road) is a must.",
      "Walkable to Hongya Cave."
    ],
    transport: "Metro Line 2 to Linjiangmen (Exit B) or Line 1/6 to Xiaoshizi.",
    comments: [
      { id: 'c6', user: { id: 'u6', name: "Shopaholic" }, text: "Vibrant energy. Great food nearby.", rating: 4 },
    ],
    image: require('../../assets/JIEFANGBEI.jpg'),
  },
  '06': {
    id: '06',
    category: 'URBAN',
    title: 'KUIXINGLOU',
    description: "The ultimate 8D city experience. A square on the 22nd floor that feels like the ground floor. A filming location for 'Better Days', featuring dizzying skybridges.",
    tips: [
      "Located near Jiefangbei.",
      "Don't trust 2D maps; look for vertical connections.",
      "Great for moody, urban photography."
    ],
    transport: "Walk from Linjiangmen Station (Line 2) to Datang Square. The plaza is on the 22nd floor.",
    comments: [
      { id: 'c7', user: { id: 'u7', name: "Lost_Soul" }, text: "My GPS gave up here. 10/10.", rating: 5 },
    ],
    image: require('../../assets/KUIXINGLOU.jpg'),
  },
  '07': {
    id: '07',
    category: 'CULTURE',
    title: 'CIQIKOU OLD TOWN',
    description: "A porcelain port town turned cultural hub. Cobblestone streets, tea houses, and the famous 'Chen Mahua' (twisted dough twists). A glimpse into old Chongqing.",
    tips: [
      "Explore the back alleys to escape the main crowd.",
      "Try the spicy chicken and fresh tea.",
      "Visit Baolun Temple for a quiet moment."
    ],
    transport: "Metro Line 1 to Ciqikou Station (Exit 1). Follow the crowd to the entrance.",
    comments: [
      { id: 'c8', user: { id: 'u8', name: "Tea_Lover" }, text: "Commercialized but charming side streets.", rating: 3 },
    ],
    image: require('../../assets/CIQIKOU_OLD_TOWN.jpg'),
  },
  '08': {
    id: '08',
    category: 'HERITAGE',
    title: 'DAZU ROCK CARVINGS',
    description: "A UNESCO World Heritage site. Thousands of religious statues carved into the cliffside, dating back to the 7th century. The 'Thousand-Hand Guanyin' is breathtaking.",
    tips: [
      "Located in Dazu District (1.5h drive/train).",
      "Baodingshan is the main site.",
      "Hire a guide or audio guide for history context."
    ],
    transport: "High-speed train to Dazu South Station, then Bus 205/207 to the scenic area.",
    comments: [
      { id: 'c9', user: { id: 'u9', name: "History_Buff" }, text: "Absolutely stunning detail.", rating: 5 },
    ],
    image: require('../../assets/DAZU_ROCK_CARVINGS.jpg'),
  },
  '09': {
    id: '09',
    category: 'NATURE',
    title: 'WULONG KARST',
    description: "Nature's grand sculpture. Featuring the Three Natural Bridges and vast sinkholes. Filming location for 'Transformers: Age of Extinction' and 'Curse of the Golden Flower'.",
    tips: [
      "Wear comfortable shoes; lots of walking.",
      "Glass skywalk is thrilling.",
      "Tianfu Official Post is a must-photo spot."
    ],
    transport: "Train to Wulong Station. Take a mini-bus from the station to the Tourist Visitor Center.",
    comments: [
      { id: 'c10', user: { id: 'u10', name: "Nature_Boy" }, text: "Epic scale. Feels prehistoric.", rating: 5 },
    ],
    image: require('../../assets/WULONG_KAEST.jpg'),
  },
  '10': {
    id: '10',
    category: 'CULTURE',
    title: 'SHIBATI OLD STREET',
    description: "The connector between the upper and lower city. A revitalized stairway district that blends traditional stilt architecture with modern trends. The 'Seven Gates' of old Chongqing.",
    tips: [
      "Visit at dusk when lanterns light up.",
      "Great for finding local snacks and crafts.",
      "Connects Jiefangbei (upper) to the river (lower)."
    ],
    transport: "Metro Line 1 or 2 to Jiaochangkou Station (Exit 3 or 4). Walk downhill.",
    comments: [
      { id: 'c11', user: { id: 'u11', name: "Walker_01" }, text: "Beautiful restoration. Good vibes.", rating: 4 },
    ],
    image: require('../../assets/SHIBATI_OLD_STREET.jpg'),
  },
};

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { accessToken, user, isPremium } = useAuth();
  const [detail, setDetail] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<LocationComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [posting, setPosting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await fetchLocationDetail(id as string, (cached) => {
            if (mounted && cached) {
                setDetail(cached);
                setComments(cached.comments || []);
            }
        });
        if (mounted) {
          setDetail(data);
          setError('');
          setComments(data.comments || []);
        }
      } catch (e: any) {
        if (mounted) {
          // Keep showing cache if available, but maybe show a toast?
          setError(e?.message || '加载失败，使用本地数据');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    
    // Check initial favorite status
    fetchFavorites().then(favs => {
        if (mounted && id) setIsFavorite(favs.some(f => f.id === id));
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  // Fallback comments if backend fails
  useEffect(() => {
    if (detail || !id) return;
    const fallback = LOCATION_DETAILS[id as string];
    if (fallback?.comments) {
      // The local comments are now already in the correct format, so we can use them directly
      // or map them if we want to ensure unique IDs dynamically.
      // But since we fixed the source, we can just use them.
      setComments(fallback.comments);
    }
  }, [detail, id]);
  
  // Data resolution
  const data = detail || LOCATION_DETAILS[id as string] || {
    title: 'UNKNOWN SECTOR',
    description: "Data corrupted or restricted access.",
    tips: ["Return to base.", "Check network connection."],
    comments: [],
    image: null
  };

  const imageSource = (data as any).image
    ? (data as any).image
    : data.imageUrl
      ? { uri: data.imageUrl }
      : require('../../assets/HUBview.jpg');

  // COMMERCIAL: Handle Favorite Logic
  const handleToggleFavorite = async () => {
    const targetId = id as string;
    if (isFavorite) {
        await removeFavorite(targetId);
        setIsFavorite(false);
    } else {
        // COMMERCIAL: Check Limits
        if (!isPremium) {
            const canAdd = await checkFavoriteLimit(3);
            if (!canAdd) {
                router.push('/paywall');
                return;
            }
        }
        await addFavorite(targetId);
        setIsFavorite(true);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (!accessToken) {
      Alert.alert('需要登录', '登录后才能发表评论', [
        { text: '取消', style: 'cancel' },
        { text: '去登录', onPress: () => router.push('/login') },
      ]);
      return;
    }
    setPosting(true);
    try {
      const newComment = await postLocationComment(id as string, { text: commentText.trim(), rating: commentRating });
      setComments([newComment, ...comments]);
      setCommentText('');
      setCommentRating(5);
    } catch (e: any) {
      Alert.alert('提交失败', e?.message || '请稍后重试');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 100}}>
        
        {/* 1. Hero Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={imageSource} 
            style={styles.image} 
            contentFit="cover"
            transition={300}
          />
          <LinearGradient 
            colors={['transparent', '#000']} 
            style={styles.gradientOverlay} 
          />
          
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <BlurView intensity={50} tint="dark" style={styles.backBtnBlur}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={handleToggleFavorite}
          >
            <BlurView intensity={50} tint="dark" style={styles.backBtnBlur}>
                <Ionicons 
                    name={isFavorite ? "bookmark" : "bookmark-outline"} 
                    size={24} 
                    color={isFavorite ? Colors.cyberpunk.neonGreen : "white"} 
                />
            </BlurView>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>{data.title}</Text>
            <View style={styles.idBadge}>
                <Text style={styles.idText}>ID // {id}</Text>
            </View>
          </View>
        </View>

        {loading && (
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="small" color={Colors.cyberpunk.neonGreen} />
            <Text style={{ color: Colors.cyberpunk.textDim }}>Syncing data...</Text>
          </View>
        )}
        {!!error && (
          <Text style={{ color: Colors.cyberpunk.neonOrange, paddingHorizontal: 20 }}>{error}</Text>
        )}

        {/* 2. Guide Section */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name="book-outline" size={20} color={Colors.cyberpunk.neonGreen} />
                <Text style={styles.sectionTitle}>TACTICAL GUIDE</Text>
            </View>
            <Text style={styles.description}>{data.description}</Text>
            
            <View style={styles.tipsContainer}>
                {data.tips?.map((tip: string, index: number) => (
                    <View key={index} style={styles.tipRow}>
                        <Ionicons name="caret-forward" size={12} color={Colors.cyberpunk.neonOrange} />
                        <Text style={styles.tipText}>{tip}</Text>
                    </View>
                ))}
            </View>
        </View>

        {/* 2.5 Navigation Uplink */}
        {data.transport && (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="map-outline" size={20} color="#E040FB" />
                    <Text style={[styles.sectionTitle, {color: '#E040FB'}]}>NAVIGATION UPLINK</Text>
                </View>
                <View style={styles.transportContainer}>
                    <Ionicons name="train-outline" size={24} color="#E040FB" style={{marginRight: 10}} />
                    <Text style={styles.transportText}>{data.transport}</Text>
                </View>
            </View>
        )}

        {/* 3. Comments Section */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name="chatbubbles-outline" size={20} color={Colors.cyberpunk.neonBlue} />
                <Text style={[styles.sectionTitle, {color: Colors.cyberpunk.neonBlue}]}>NETRUNNER LOGS</Text>
            </View>
            
            {comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>{comment.user?.name || (comment.user as any)?.nickname || comment.user?.id || 'Anonymous'}</Text>
                        <View style={styles.rating}>
                            {Array.from({length: 5}).map((_, i) => (
                                <Ionicons 
                                    key={i} 
                                    name="star" 
                                    size={10} 
                                    color={i < (comment.rating || 0) ? Colors.cyberpunk.neonOrange : '#333'} 
                                />
                            ))}
                        </View>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                </View>
            ))}

            <View style={styles.commentForm}>
              <Text style={styles.formLabel}>Publish your log</Text>
              <View style={styles.ratingSelector}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => setCommentRating(i + 1)}>
                    <Ionicons
                      name="star"
                      size={20}
                      color={i < commentRating ? Colors.cyberpunk.neonOrange : '#333'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.commentInput}
                multiline
                placeholder="Share routes, traps, or hidden easter eggs..."
                placeholderTextColor="#555"
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity style={[styles.addCommentBtn, posting && { opacity: 0.7 }]} onPress={handleSubmitComment} disabled={posting}>
                {posting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.addCommentText}>SUBMIT LOG</Text>
                )}
              </TouchableOpacity>
            </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    height: 350,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  backBtnBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  titleContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textTransform: 'uppercase',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  idBadge: {
    backgroundColor: Colors.cyberpunk.neonGreen,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  idText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  description: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 20,
  },
  tipsContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.cyberpunk.neonOrange,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    color: '#aaa',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  transportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 64, 251, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(224, 64, 251, 0.3)',
  },
  transportText: {
    color: '#eee',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  commentCard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rating: {
    flexDirection: 'row',
    gap: 2,
  },
  commentText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  addCommentBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 5,
  },
  addCommentText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  commentForm: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderRadius: 8,
    backgroundColor: '#0b0b0b',
  },
  formLabel: {
    color: Colors.cyberpunk.text,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  commentInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 10,
    color: Colors.cyberpunk.text,
    marginBottom: 10,
  },
});
