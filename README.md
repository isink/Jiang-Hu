# Jianghu - Chongqing Guide

A cyberpunk-themed urban exploration app for Chongqing, built with React Native and Expo.

## Features

- **Cyberpunk UI**: Custom dark mode design with neon accents.
- **Interactive Map**: OpenStreetMap (OSM) data with dark mode tiles and custom markers.
- **Location Database**: Curated spots ("8D City" locations).
- **Navigation**: Custom floating tab bar.

## Tech Stack

- **Framework**: React Native (Expo Managed Workflow)
- **Language**: TypeScript
- **Routing**: Expo Router
- **Maps**: react-native-maps (with CartoDB Dark Matter tiles)
- **Icons**: Ionicons (@expo/vector-icons)
- **Effects**: expo-blur, expo-linear-gradient

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npx expo start
   ```

3. Scan the QR code with your phone (Expo Go app) or press `i` for iOS Simulator / `a` for Android Emulator.

## Project Structure

- `app/`: Expo Router screens.
  - `(tabs)/`: Main tab navigation (Home, Map, ID).
- `components/`: Reusable UI components.
- `constants/`: Theme and color definitions (`theme.ts`).
- `assets/`: Images and fonts.

## Credits

Based on the "Jianghu" concept design. Map data © OpenStreetMap contributors.