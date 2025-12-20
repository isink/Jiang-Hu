import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, Platform, Linking, Modal, Dimensions, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAuth } from '@/hooks/use-auth';
import { updateProfile, fetchPhrases, createPhrase, fetchRate, Phrase } from '@/services/user';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const METRO_MAP_PDF = require('../../assets/metromap.pdf');
const METRO_MAP_PNG = require('../../assets/metromap.png');

const LOCAL_PHRASES: Phrase[] = [
  { id: 'local-1', en: "Where is the toilet?", cn: "厕所在哪里?", py: "Cèsuǒ zài nǎlǐ?" },
  { id: 'local-2', en: "Too spicy!", cn: "太辣了!", py: "Tài là le!" },
  { id: 'local-3', en: "How much?", cn: "多少钱?", py: "Duōshǎo qián?" },
  { id: 'local-4', en: "No spicy, please.", cn: "不要辣.", py: "Bùyào là." },
];

type ToolType = 'CURRENCY' | 'TRANSLATE' | 'EMERGENCY' | 'SETTINGS' | 'METRO' | null;

export default function IDScreen() {
  const router = useRouter();
  const { user, accessToken, logout, refreshProfile, isPremium } = useAuth();
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [cnyAmount, setCnyAmount] = useState('100');
  const [usdAmount, setUsdAmount] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('jianghu');
  
  // User Profile State
  const [username, setUsername] = useState(user?.nickname || 'JIANGHU WALKER');
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Currency State
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('Loading...');
  const [rateLoading, setRateLoading] = useState(false);

  // Translate State
  const [phrases, setPhrases] = useState<Phrase[]>(LOCAL_PHRASES);
  const [phrasesLoading, setPhrasesLoading] = useState(false);
  const [focusedPhrase, setFocusedPhrase] = useState<Phrase | null>(null);
  const [isAddingPhrase, setIsAddingPhrase] = useState(false);
  const [newPhrase, setNewPhrase] = useState({en: '', cn: '', py: ''});

  const [metroPdfUri, setMetroPdfUri] = useState<string | null>(null);
  const [metroPngUri, setMetroPngUri] = useState<string | null>(null);
  const [metroLoading, setMetroLoading] = useState(true);
  const [metroError, setMetroError] = useState<string | null>(null);

  const baseScale = useSharedValue(1);
  const pinchScale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  const avatarUri = user?.avatarUrl || `https://api.dicebear.com/9.x/adventurer/png?seed=${avatarSeed}`;

  useEffect(() => {
    let active = true;
    const loadMetroAssets = async () => {
      setMetroLoading(true);
      try {
        const [pdfAsset, pngAsset] = await Asset.loadAsync([METRO_MAP_PDF, METRO_MAP_PNG]);
        if (!active) return;
        setMetroPdfUri(pdfAsset.localUri || pdfAsset.uri);
        setMetroPngUri(pngAsset.localUri || pngAsset.uri);
      } catch (e) {
        if (active) setMetroError('地铁图加载失败');
      } finally {
        if (active) setMetroLoading(false);
      }
    };
    loadMetroAssets();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user?.nickname) {
      setUsername(user.nickname);
    }
  }, [user?.nickname]);

  const handleProfileSave = async (newName?: string, newAvatarUrl?: string) => {
    if (!accessToken) return; // Silent return if not logged in, local state is enough
    
    const updates: { nickname?: string; avatarUrl?: string } = {};
    if (newName) updates.nickname = newName;
    if (newAvatarUrl) updates.avatarUrl = newAvatarUrl;
    
    if (Object.keys(updates).length === 0) return;

    try {
      await updateProfile(updates);
      await refreshProfile();
    } catch (e: any) {
      Alert.alert('同步失败', '无法保存个人资料到云端');
    }
  };

  const generateAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatarSeed(randomSeed);
    const newUrl = `https://api.dicebear.com/9.x/adventurer/png?seed=${randomSeed}`;
    handleProfileSave(undefined, newUrl);
  };

  const handleNameSave = () => {
      const name = username.trim().length === 0 ? 'JIANGHU WALKER' : username.trim();
      setUsername(name);
      setIsEditingName(false);
      handleProfileSave(name);
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleAddPhrase = async () => {
    if (!newPhrase.en || !newPhrase.cn) return;
    try {
      let saved: Phrase;
      if (accessToken) {
        saved = await createPhrase({ ...newPhrase });
      } else {
        saved = { ...newPhrase, id: `local-${Date.now()}` };
      }
      setPhrases([...phrases, saved]);
      setNewPhrase({ en: '', cn: '', py: '' });
      setIsAddingPhrase(false);
    } catch (e: any) {
      Alert.alert('保存失败', e?.message || '请稍后重试');
    }
  };

  useEffect(() => {
    if (selectedTool !== 'TRANSLATE' || !accessToken) return;
    let mounted = true;
    setPhrasesLoading(true);
    fetchPhrases()
      .then((data) => {
        if (mounted && data?.length) setPhrases(data);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setPhrasesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedTool, accessToken]);

  // Fetch Exchange Rate & Init USD
  useEffect(() => {
    if (selectedTool !== 'CURRENCY') return;
    let mounted = true;
    const loadRate = async () => {
      setRateLoading(true);
      try {
        const data = await fetchRate();
        const rate = (data as any).rate ?? (data as any)?.rates?.USD ?? 0.138;
        if (!mounted) return;
        setExchangeRate(rate);
        setLastUpdated(data.date || 'Live');
        if (usdAmount === '') setUsdAmount((parseFloat(cnyAmount) * rate).toFixed(2));
      } catch (e) {
        if (!mounted) return;
        setLastUpdated('Offline Mode');
        const fallback = 0.138;
        setExchangeRate(fallback);
        if (usdAmount === '') setUsdAmount((parseFloat(cnyAmount) * fallback).toFixed(2));
      } finally {
        if (mounted) setRateLoading(false);
      }
    };
    loadRate();
    return () => {
      mounted = false;
    };
  }, [selectedTool]);

  const parseAmount = (val: string) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  };

  const handleCnyChange = (val: string) => {
      setCnyAmount(val);
      const rate = exchangeRate || 0.138;
      if (val === '') {
          setUsdAmount('');
          return;
      }
      const parsed = parseAmount(val);
      if (parsed === null) {
          setUsdAmount('');
          return;
      }
      setUsdAmount((parsed * rate).toFixed(2));
  };

  const handleUsdChange = (val: string) => {
      setUsdAmount(val);
      const rate = exchangeRate || 0.138;
      if (val === '') {
          setCnyAmount('');
          return;
      }
      const parsed = parseAmount(val);
      if (parsed === null) {
          setCnyAmount('');
          return;
      }
      setCnyAmount((parsed / rate).toFixed(2));
  };

  useEffect(() => {
    if (selectedTool !== 'METRO') {
      baseScale.value = 1;
      pinchScale.value = 1;
      panX.value = 0;
      panY.value = 0;
    }
  }, [selectedTool]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      pinchScale.value = event.scale;
    })
    .onEnd(() => {
      const nextScale = Math.min(Math.max(baseScale.value * pinchScale.value, 1), 4);
      baseScale.value = nextScale;
      pinchScale.value = withTiming(1, { duration: 150 });
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // TS Workaround: changeX/changeY exist at runtime in Reanimated 3+
      panX.value += (event as any).changeX;
      panY.value += (event as any).changeY;
    })
    .onEnd(() => {
      panX.value = withTiming(0, { duration: 200 });
      panY.value = withTiming(0, { duration: 200 });
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const metroImageStyle = useAnimatedStyle(() => {
    const scale = baseScale.value * pinchScale.value;
    return {
      transform: [
        { translateX: panX.value },
        { translateY: panY.value },
        { scale },
      ],
    };
  });

  const renderToolContent = () => {
    switch (selectedTool) {
      case 'CURRENCY':
        const currentRate = exchangeRate || 0.138;
        return (
          <View style={styles.modalContent}>
            <View style={styles.cardHeader}>
              <Ionicons name="cash-outline" size={24} color={Colors.cyberpunk.neonGreen} />
              <Text style={styles.modalTitle}>EXCHANGE RATE</Text>
            </View>
            <View style={styles.converterRow}>
              <View style={styles.currencyBlock}>
                <Text style={styles.currencyLabel}>CNY (¥)</Text>
                <TextInput 
                  style={styles.input}
                  value={cnyAmount}
                  onChangeText={handleCnyChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#555"
                />
              </View>
              <Ionicons name="swap-horizontal" size={24} color="#555" style={{marginTop: 20}} />
              <View style={styles.currencyBlock}>
                <Text style={styles.currencyLabel}>USD ($)</Text>
                <TextInput 
                  style={[styles.input, {color: Colors.cyberpunk.neonOrange}]}
                  value={usdAmount}
                  onChangeText={handleUsdChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#555"
                />
              </View>
            </View>
            <Text style={styles.modalHint}>Rate: 1 CNY ≈ {currentRate.toFixed(4)} USD • {lastUpdated}</Text>
            {rateLoading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <ActivityIndicator size="small" color={Colors.cyberpunk.neonGreen} />
                <Text style={{ color: Colors.cyberpunk.textDim }}>同步汇率…</Text>
              </View>
            )}
          </View>
        );
      case 'TRANSLATE':
        if (focusedPhrase) {
            return (
                <View style={{flex: 1, margin: -25, backgroundColor: '#000', borderRadius: 20, justifyContent: 'center', alignItems: 'center'}}>
                    <TouchableOpacity style={{width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: 20}} onPress={() => setFocusedPhrase(null)} activeOpacity={1}>
                        <Text style={styles.maximizedCn}>{focusedPhrase.cn}</Text>
                        <Text style={styles.maximizedPy}>{focusedPhrase.py}</Text>
                        <View style={styles.divider} />
                        <Text style={styles.maximizedEn}>{focusedPhrase.en}</Text>
                        <Text style={styles.tapToClose}>(TAP TO CLOSE)</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        if (isAddingPhrase) {
            return (
                <View style={styles.modalContent}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="add-circle-outline" size={24} color={Colors.cyberpunk.neonBlue} />
                        <Text style={[styles.modalTitle, {color: Colors.cyberpunk.neonBlue}]}>NEW PHRASE</Text>
                    </View>
                    <View style={{gap: 15}}>
                        <View>
                            <Text style={styles.currencyLabel}>ENGLISH</Text>
                            <TextInput 
                                style={[styles.input, {fontSize: 16}]} 
                                value={newPhrase.en} 
                                onChangeText={(t) => setNewPhrase({...newPhrase, en: t})}
                                placeholder="e.g. No Cilantro"
                                placeholderTextColor="#555"
                            />
                        </View>
                        <View>
                            <Text style={styles.currencyLabel}>CHINESE</Text>
                            <TextInput 
                                style={[styles.input, {fontSize: 16}]} 
                                value={newPhrase.cn} 
                                onChangeText={(t) => setNewPhrase({...newPhrase, cn: t})}
                                placeholder="e.g. 不要香菜"
                                placeholderTextColor="#555"
                            />
                        </View>
                        <View>
                            <Text style={styles.currencyLabel}>PINYIN (OPTIONAL)</Text>
                            <TextInput 
                                style={[styles.input, {fontSize: 16}]} 
                                value={newPhrase.py} 
                                onChangeText={(t) => setNewPhrase({...newPhrase, py: t})}
                                placeholder="e.g. Bùyào xiāngcài"
                                placeholderTextColor="#555"
                            />
                        </View>
                        <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                            <TouchableOpacity style={[styles.secondaryBtn, {flex: 1}]} onPress={() => setIsAddingPhrase(false)}>
                                <Text style={styles.secondaryBtnText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, {backgroundColor: Colors.cyberpunk.neonBlue, flex: 1}]} onPress={handleAddPhrase}>
                                <Text style={styles.primaryBtnText}>SAVE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }
        return (
          <View style={styles.modalContent}>
            <View style={styles.cardHeader}>
              <Ionicons name="language" size={24} color={Colors.cyberpunk.neonGreen} />
              <Text style={styles.modalTitle}>VOCAL SYNTHESIS</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 400}}>
              {phrasesLoading && (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8}}>
                  <ActivityIndicator size="small" color={Colors.cyberpunk.neonGreen} />
                  <Text style={{color: Colors.cyberpunk.textDim}}>加载短语…</Text>
                </View>
              )}
              {phrases.map((phrase, index) => (
                <TouchableOpacity key={phrase.id || index} style={styles.phraseRow} activeOpacity={0.7} onPress={() => setFocusedPhrase(phrase)}>
                  <View style={{flex: 1}}>
                    <Text style={styles.phraseEn}>{phrase.en}</Text>
                    <Text style={styles.phraseCn}>{phrase.cn}</Text>
                    <Text style={styles.phrasePy}>{phrase.py}</Text>
                  </View>
                  <Ionicons name="expand-outline" size={16} color="#666" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addPhraseBtn} onPress={() => setIsAddingPhrase(true)}>
                  <Ionicons name="add" size={20} color={Colors.cyberpunk.neonBlue} />
                  <Text style={styles.addPhraseText}>ADD CUSTOM PHRASE</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        );
      case 'EMERGENCY':
        return (
          <View style={styles.modalContent}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning-outline" size={24} color={Colors.cyberpunk.neonOrange} />
              <Text style={[styles.modalTitle, {color: Colors.cyberpunk.neonOrange}]}>EMERGENCY PROTOCOLS</Text>
            </View>
            <View style={{gap: 15}}>
              <TouchableOpacity style={styles.emergencyBtn} onPress={() => handleCall('110')}>
                <Ionicons name="shield" size={32} color="white" />
                <View style={{marginLeft: 20}}>
                  <Text style={styles.emergencyText}>POLICE</Text>
                  <Text style={styles.emergencyNumber}>110</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.emergencyBtn, styles.medicalBtn]} onPress={() => handleCall('120')}>
                <Ionicons name="medkit" size={32} color="white" />
                <View style={{marginLeft: 20}}>
                  <Text style={styles.emergencyText}>MEDICAL</Text>
                  <Text style={styles.emergencyNumber}>120</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'METRO':
        return (
          <View style={styles.metroCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="map-outline" size={24} color="#00F0FF" />
              <Text style={[styles.modalTitle, {color: '#00F0FF'}]}>METRO SYSTEM</Text>
            </View>

            {metroLoading && (
              <View style={styles.metroStatus}>
                <ActivityIndicator size="small" color="#00F0FF" />
                <Text style={styles.metroStatusText}>地铁图加载中…</Text>
              </View>
            )}

            {metroError && !metroLoading && (
              <View style={styles.metroStatus}>
                <Ionicons name="alert-circle-outline" size={20} color="#ff8c66" />
                <Text style={[styles.metroStatusText, { color: '#ff8c66' }]}>{metroError}</Text>
              </View>
            )}

            {!metroLoading && !metroError && (
              Platform.OS === 'ios' && metroPdfUri ? (
                <WebView
                  source={{ uri: metroPdfUri }}
                  style={{ flex: 1, backgroundColor: '#000' }}
                  originWhitelist={['*']}
                  decelerationRate="normal"
                  scrollEnabled
                  useSharedProcessPool={false}
                  allowsInlineMediaPlayback
                />
              ) : (
                <GestureDetector gesture={composedGesture}>
                  <View style={styles.metroViewer}>
                    <Animated.View style={[styles.metroImageWrapper, metroImageStyle]}>
                      {metroPngUri ? (
                        <Image
                          source={{ uri: metroPngUri }}
                          style={styles.metroImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.metroStatusText}>未找到地铁图资源</Text>
                      )}
                    </Animated.View>
                  </View>
                </GestureDetector>
              )
            )}
          </View>
        );
      case 'SETTINGS':
        return (
          <View style={styles.modalContent}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#888" />
              <Text style={styles.modalTitle}>NETWATCH PROTOCOL</Text>
            </View>
            <Text style={{color: '#888', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 10}}>
                System Integrity: 100%
            </Text>
            <Text style={{color: '#888', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'}}>
                Version: 1.0.0 (Alpha)
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0a0a0a']}
        style={styles.background}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={[
            styles.operatorCard, 
            isPremium && { borderColor: Colors.cyberpunk.neonGreen, borderWidth: 1, shadowColor: Colors.cyberpunk.neonGreen, shadowOpacity: 0.3, shadowRadius: 10 }
        ]}>
            <View style={styles.operatorHeader}>
                <Text style={[styles.operatorId, isPremium && { color: Colors.cyberpunk.neonGreen }]}>
                    {isPremium ? 'NETRUNNER_ID // 5CCA876A' : 'GUEST_ACCESS // LIMITED'}
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                    {user ? (
                      <TouchableOpacity onPress={logout}>
                        <Text style={styles.editLabel}>LOGOUT</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/login')}>
                        <Text style={styles.editLabel}>LOGIN</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setIsEditingName(true)}>
                        <Text style={styles.editLabel}>EDIT</Text>
                    </TouchableOpacity>
                    <View style={[styles.statusDot, isPremium && { backgroundColor: Colors.cyberpunk.neonGreen, shadowColor: Colors.cyberpunk.neonGreen, shadowOpacity: 1, shadowRadius: 5 }]} />
                </View>
            </View>
            
            <View style={styles.profileRow}>
                <TouchableOpacity style={[styles.avatarBox, isPremium && { borderColor: Colors.cyberpunk.neonGreen }]} onPress={generateAvatar}>
                    <Image 
                        source={{ uri: avatarUri }} 
                        style={styles.avatarImage} 
                    />
                </TouchableOpacity>
                <View style={styles.profileInfo}>
                    {isEditingName ? (
                        <TextInput
                            style={[styles.profileName, {borderBottomWidth:1, borderColor: Colors.cyberpunk.neonOrange}]}
                            value={username}
                            onChangeText={setUsername}
                            onBlur={handleNameSave}
                            onSubmitEditing={handleNameSave}
                            autoFocus
                        />
                    ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                             <Text style={styles.profileName}>{username}</Text>
                             {isPremium && <Ionicons name="checkmark-circle" size={16} color={Colors.cyberpunk.neonGreen} />}
                        </View>
                    )}
                    
                    {/* COMMERCIAL: UPGRADE BUTTON OR STATUS */}
                    {!isPremium ? (
                        <TouchableOpacity 
                            style={styles.upgradeBtn}
                            onPress={() => router.push('/paywall')}
                        >
                            <Ionicons name="lock-open" size={12} color="black" />
                            <Text style={styles.upgradeText}>INITIALIZE UPLINK</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.premiumBadge}>// LEGEND STATUS ACTIVE</Text>
                    )}

                    <View style={styles.coverageBar}>
                        <View style={[styles.coverageFill, { width: isPremium ? '100%' : '30%', backgroundColor: isPremium ? Colors.cyberpunk.neonGreen : '#444' }]} />
                    </View>
                    <Text style={styles.coverageText}>
                        {isPremium ? 'SYSTEM OPTIMIZED: 100%' : 'CAPACITY LIMITED: 30%'}
                    </Text>
                </View>
            </View>
            
            {/* Barcode Deco */}
            <View style={styles.barcodeStrip}>
                {Array.from({length: 20}).map((_,i) => (
                    <View key={i} style={[styles.barcodeLine, {opacity: Math.random()}]} />
                ))}
            </View>
        </View>

        {/* Command Center */}
        <Text style={styles.sectionLabel}>COMMAND CENTER</Text>
        <View style={styles.commandList}>
            <TouchableOpacity style={styles.commandRow} onPress={() => router.push('/favorites')}>
                <View style={styles.commandLeft}>
                    <Ionicons name="bookmark-outline" size={20} color={Colors.cyberpunk.neonGreen} />
                    <Text style={[styles.commandText, {color: Colors.cyberpunk.neonGreen}]}>Memory Stash</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>
            
            <View style={styles.separator} />

            <TouchableOpacity style={styles.commandRow} onPress={() => setSelectedTool('CURRENCY')}>
                <View style={styles.commandLeft}>
                    <Ionicons name="cash-outline" size={20} color="#888" />
                    <Text style={styles.commandText}>Exchange Rate</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>
            
            <View style={styles.separator} />

            <TouchableOpacity style={styles.commandRow} onPress={() => setSelectedTool('TRANSLATE')}>
                <View style={styles.commandLeft}>
                    <Ionicons name="language-outline" size={20} color="#888" />
                    <Text style={styles.commandText}>Translator</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.commandRow} onPress={() => setSelectedTool('EMERGENCY')}>
                <View style={styles.commandLeft}>
                    <Ionicons name="warning-outline" size={20} color="#888" />
                    <Text style={styles.commandText}>Emergency SOS</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.commandRow} onPress={() => setSelectedTool('METRO')}>
                <View style={styles.commandLeft}>
                    <Ionicons name="map-outline" size={20} color="#888" />
                    <Text style={styles.commandText}>Metro Map</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.commandRow} onPress={() => setSelectedTool('SETTINGS')}>
                <View style={styles.commandLeft}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#888" />
                    <Text style={styles.commandText}>NetWatch Protocol</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>
        </View>

        {/* System Actions */}
        <View style={[styles.commandList, {marginTop: 30}]}>
            <TouchableOpacity style={styles.commandRow}>
                <View style={styles.commandLeft}>
                    <Ionicons name="trash-outline" size={20} color="#888" />
                    <Text style={styles.commandText}>Clear Cache</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>
            
            <View style={styles.separator} />

            <TouchableOpacity style={styles.commandRow}>
                <View style={styles.commandLeft}>
                    <Ionicons name="log-out-outline" size={20} color={Colors.cyberpunk.neonOrange} />
                    <Text style={[styles.commandText, {color: Colors.cyberpunk.neonOrange}]}>Disconnect</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal Overlay */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedTool}
        onRequestClose={() => setSelectedTool(null)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
        >
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
             {renderToolContent()}
             
             {/* Only show global close button if not in a sub-view (Maximized or Adding) */}
             {(!focusedPhrase && !isAddingPhrase) && (
                 <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedTool(null)}>
                   <Ionicons name="close-circle" size={40} color="white" />
                 </TouchableOpacity>
             )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 130, 
    flexGrow: 1,
  },
  // Header Card Styles
  operatorCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 30,
  },
  operatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 15,
  },
  operatorId: {
    color: '#666',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  editLabel: {
    color: Colors.cyberpunk.neonOrange,
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 10,
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.cyberpunk.neonGreen,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 70,
    height: 70,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  avatarImage: {
    width: 60,
    height: 60,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  coverageBar: {
    height: 4,
    backgroundColor: '#222',
    width: '100%',
    marginBottom: 6,
  },
  coverageFill: {
    width: '75%',
    height: '100%',
    backgroundColor: Colors.cyberpunk.neonOrange,
  },
  coverageText: {
    color: '#555',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  upgradeBtn: {
    backgroundColor: Colors.cyberpunk.neonOrange,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upgradeText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  premiumBadge: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 10,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  barcodeStrip: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    height: 10,
    gap: 2,
  },
  barcodeLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#333',
  },
  // Command Center Styles
  sectionLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 1,
    marginLeft: 5,
  },
  commandList: {
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  commandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  commandText: {
    color: '#eee',
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginLeft: 55, 
  },
  // Modal & Tool Styles (Reused)
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: '80%',
  },
  modalContent: {
    width: '100%',
  },
  closeModalBtn: {
    marginTop: 20,
    alignSelf: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginLeft: 10,
    letterSpacing: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalHint: {
    color: '#666',
    fontSize: 10,
    marginTop: 20,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontStyle: 'italic',
  },
  converterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyBlock: {
    flex: 1,
  },
  currencyLabel: {
    color: '#CCC',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  input: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultText: {
    color: Colors.cyberpunk.neonOrange,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 5,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  phraseEn: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phraseCn: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 14,
    marginBottom: 2,
  },
  phrasePy: {
    color: '#AAA',
    fontSize: 12,
    fontStyle: 'italic',
  },
  addPhraseBtn: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addPhraseText: {
    color: Colors.cyberpunk.neonBlue,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  maximizedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    minHeight: 300,
    backgroundColor: '#000',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cyberpunk.neonGreen,
  },
  maximizedCn: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  maximizedPy: {
    color: '#AAA',
    fontSize: 18,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  maximizedEn: {
    color: '#DDD',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tapToClose: {
    color: '#666',
    fontSize: 10,
    marginTop: 30,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  divider: {
    height: 1,
    width: 50,
    backgroundColor: '#333',
    marginVertical: 10,
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  medicalBtn: {
    backgroundColor: '#004d40',
    borderColor: '#00bfa5',
  },
  emergencyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  emergencyNumber: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.cyberpunk.neonBlue,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  secondaryBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  metroCard: {
    height: 500,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  metroStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metroStatusText: {
    color: '#AAA',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metroViewer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metroImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metroImage: {
    width: '100%',
    height: '100%',
  },
});
