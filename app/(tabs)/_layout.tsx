import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isPremium } = useAuth();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Disable top header as requested
        headerTransparent: true,
        headerTitleStyle: {
            color: '#FFF',
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontWeight: 'bold',
        },
        headerBackground: () => (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        // headerRight: Removed per user request to move paywall trigger to ID screen
        tabBarStyle: {
          position: 'absolute',
          bottom: 30,
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: 'transparent',
          borderRadius: 32,
          height: 64,
          borderTopWidth: 0,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
        },
        tabBarBackground: () => (
            <BlurView 
                intensity={80} 
                tint="dark" 
                style={{
                    ...StyleSheet.absoluteFillObject, 
                    borderRadius: 32, 
                    overflow: 'hidden',
                    backgroundColor: 'rgba(0,0,0,0.5)'
                }} 
            />
        ),
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.cyberpunk.neonGreen,
        tabBarInactiveTintColor: '#555',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'HUB',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? "planet" : "planet-outline"} 
                size={26} 
                color={focused ? Colors.cyberpunk.neonGreen : '#666'} 
              />
              {focused && <View style={styles.activeGlow} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'MAP',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? "map" : "map-outline"} 
                size={26} 
                color={focused ? Colors.cyberpunk.neonGreen : '#666'} 
              />
              {focused && <View style={styles.activeGlow} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="id"
        options={{
          title: 'ID',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? "finger-print" : "finger-print-outline"} 
                size={26} 
                color={focused ? Colors.cyberpunk.neonGreen : '#666'} 
              />
              {focused && <View style={styles.activeGlow} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    width: 50,
  },
  activeGlow: {
    position: 'absolute',
    bottom: -12,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.cyberpunk.neonGreen,
    shadowColor: Colors.cyberpunk.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
});