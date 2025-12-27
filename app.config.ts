import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Jianghu',
  slug: 'jianghu',
  version: '1.0.7',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'jianghu',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.wenhandong.jianghu',
    buildNumber: '5',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Jianghu uses your location to display your current position on the map and calculate distances to nearby landmarks.',
    },
  },
  android: {
    package: 'com.wenhandong.jianghu',
    versionCode: 10,
    edgeToEdgeEnabled: true,
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: 'handwanly',
        project: 'jianghu',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  updates: {
    url: 'https://u.expo.dev/5b024e0a-1a55-4c84-9fbf-d1d6618e82e5',
    fallbackToCacheTimeout: 0,
  },
  extra: {
    eas: {
      projectId: '5b024e0a-1a55-4c84-9fbf-d1d6618e82e5',
    },
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
});
