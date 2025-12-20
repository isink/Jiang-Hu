import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useHaptics } from '@/hooks/use-haptics';
import { BlurView } from 'expo-blur';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
  const router = useRouter();
  const { restorePurchases } = useAuth(); // We don't need isPremium here, we want to buy
  const haptics = useHaptics();
  
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const loadOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null) {
          setOffering(offerings.current);
        }
      } catch (e) {
        Alert.alert('Error', 'Unable to fetch offerings');
      } finally {
        setLoading(false);
      }
    };
    loadOfferings();
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (purchasing) return;
    setPurchasing(true);
    haptics.selection();
    
    try {
      await Purchases.purchasePackage(pkg);
      // If successful, auth listener in useAuth will update isPremium automatically
      haptics.success();
      router.back();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Failed', e.message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      await restorePurchases();
      Alert.alert('Restored', 'Your purchases have been restored.');
      router.back();
    } catch (e) {
      // Error handled in hook or ignored
    } finally {
      setPurchasing(false);
    }
  };

  // Find packages from offering
  // Assuming 'weekly' and 'lifetime' are identifiers in RC, or just grab available packages
  // Ideally, setup Offering in RC with specific identifiers like 'weekly' and 'lifetime'
  // Or just iterate offering.availablePackages
  
  // Helper to find package by identifier substring or custom logic
  const weeklyPkg = offering?.availablePackages.find(p => p.identifier.includes('weekly'));
  const lifetimePkg = offering?.availablePackages.find(p => p.identifier.includes('lifetime'));

  return (
    <View style={styles.container}>
        <ImageBackground
            source={require('../assets/images/android-icon-background.png')}
            style={StyleSheet.absoluteFill}
            blurRadius={30}
        >
             <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        </ImageBackground>

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color="#FFF" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
            <Ionicons name="lock-closed" size={48} color={Colors.cyberpunk.neonOrange} />
            <Text style={styles.title}>RESTRICTED ACCESS</Text>
            <Text style={styles.subtitle}>
                Upgrade your cortex implant to unlock premium features.
            </Text>
        </View>

        <View style={styles.featuresList}>
             <View style={styles.featureRow}>
                <Ionicons name="navigate-circle" size={24} color={Colors.cyberpunk.neonGreen} />
                <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>GPS MODULE</Text>
                    <Text style={styles.featureDesc}>Real-time tracking. Never get lost in 8D city.</Text>
                </View>
             </View>
             <View style={styles.featureRow}>
                <Ionicons name="wifi" size={24} color={Colors.cyberpunk.neonGreen} />
                <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>CLEAN DATA FEED</Text>
                    <Text style={styles.featureDesc}>Zero noise. No ads. Pure information.</Text>
                </View>
             </View>
             <View style={styles.featureRow}>
                <Ionicons name="infinite" size={24} color={Colors.cyberpunk.neonGreen} />
                <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>UNLIMITED MEMORY</Text>
                    <Text style={styles.featureDesc}>Save infinite locations to your personal database.</Text>
                </View>
             </View>
        </View>

        <Text style={styles.sectionHeader}>SELECT AUTHORIZATION LEVEL</Text>

        {loading ? (
            <ActivityIndicator size="large" color={Colors.cyberpunk.neonGreen} style={{marginTop: 20}} />
        ) : (
            <>
                {/* Weekly Plan */}
                {weeklyPkg && (
                    <TouchableOpacity 
                        style={[styles.planCard, { borderColor: Colors.cyberpunk.neonGreen }]}
                        onPress={() => handlePurchase(weeklyPkg)}
                        disabled={purchasing}
                    >
                        <View style={[styles.planBadge, { backgroundColor: Colors.cyberpunk.neonGreen }]}>
                            <Text style={styles.planBadgeText}>POPULAR</Text>
                        </View>
                        <View style={styles.planContent}>
                            <View>
                                <Text style={[styles.planTitle, { color: Colors.cyberpunk.neonGreen }]}>WEEKLY PASS</Text>
                                <Text style={styles.planDesc}>7-Day Link</Text>
                            </View>
                            <Text style={styles.planPrice}>{weeklyPkg.product.priceString}</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Lifetime Plan */}
                {lifetimePkg && (
                    <TouchableOpacity 
                        style={[styles.planCard, { borderColor: Colors.cyberpunk.neonOrange, marginTop: 16 }]}
                        onPress={() => handlePurchase(lifetimePkg)}
                        disabled={purchasing}
                    >
                        <View style={[styles.planBadge, { backgroundColor: Colors.cyberpunk.neonOrange }]}>
                            <Text style={styles.planBadgeText}>BEST VALUE</Text>
                        </View>
                        <View style={styles.planContent}>
                            <View>
                                <Text style={[styles.planTitle, { color: Colors.cyberpunk.neonOrange }]}>LIFETIME LEGEND</Text>
                                <Text style={styles.planDesc}>Permanent Digital Identity</Text>
                            </View>
                            <Text style={styles.planPrice}>{lifetimePkg.product.priceString}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                
                {!weeklyPkg && !lifetimePkg && (
                    <Text style={{color: 'red', marginTop: 20, textAlign: 'center'}}>
                        [DEV] No Offerings Found. Check RevenueCat Config.
                    </Text>
                )}
            </>
        )}

        <TouchableOpacity onPress={handleRestore} style={{marginTop: 30}} disabled={purchasing}>
            <Text style={styles.restoreText}>RESTORE PURCHASES</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
            Recurring billing. Cancel anytime. By purchasing, you agree to our Terms of Service.
        </Text>
      </ScrollView>
      
      {purchasing && (
          <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="white" />
          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Fallback
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 16,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  subtitle: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  featuresList: {
    marginBottom: 40,
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  featureDesc: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 1,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'relative',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  planDesc: {
    color: '#CCC',
    fontSize: 12,
    marginTop: 4,
  },
  planPrice: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  restoreText: {
    color: '#888',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontSize: 12,
  },
  disclaimer: {
    color: '#444',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
  }
});