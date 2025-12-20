# ⚔️ 江湖 (Jiang-Hu): Chongqing Cyberpunk Guide

[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=for-the-badge&logo=expo)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react)](https://reactnative.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![RevenueCat](https://img.shields.io/badge/RevenueCat-In--App_Purchases-FF4B5B?style=for-the-badge&logo=revenuecat)](https://www.revenuecat.com/)

> **"Welcome to the 8D City. Navigate the labyrinth, or get lost in the neon fog."**

`Jiang-Hu` is a high-performance, offline-first travel guide for Chongqing, built with a cutting-edge cyberpunk aesthetic. It solves the unique vertical navigation challenges of the world's most complex mountain city.

---

## 🚀 Key Features

*   **Cybermap**: Real-time POI visualization with WGS-84 coordinate correction for standard map tiles.
*   **Identity System**: Tiered access levels (Guest vs. NetRunner) with premium features.
*   **Memory Stash**: Offline-first bookmarking system for saving tactical locations.
*   **Command Center**: Integrated tools including Currency Converter, Vocal Synthesis (Translator), and Metro System maps.
*   **Performance Locked**: Powered by FlashList and Reanimated 3 for consistent 60fps experience.

---

## 🛠 Tech Stack

- **Framework**: Expo (SDK 54) / React Native
- **Styling**: Cyberpunk Dark Theme (Custom Neon Palette)
- **Backend**: Supabase (PostgreSQL + RLS + Functions)
- **Monetization**: RevenueCat (Google Play Store Integration)
- **Monitoring**: Sentry (Real-time error tracking)
- **Navigation**: Expo Router (File-based routing)

---

## 📦 Commercial Tier Protocol

Following the `COMMERCIAL_DESIGN.md` whitepaper, the app implements a strict authorization matrix:

| Feature | 🌑 Guest | 🌕 NetRunner |
| :--- | :--- | :--- |
| **GPS Tracking** | Restricted | Real-time Enabled |
| **Data Feed** | Ad-Interrupted | Zero-Noise Pure Feed |
| **Favorites** | Max 3 Fragments | Unlimited Stash |

---

## ⌨️ Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/isink/Jiang-Hu.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Config**
   Create a `.env` file with your keys:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=your_key
   ```

4. **Run the simulation**
   ```bash
   npx expo start
   ```

---

## 🏛 Architecture

- `app/`: Expo Router pages and modal screens.
- `services/`: API, Auth, and Data logic layers.
- `hooks/`: Custom state management (Auth, Haptics).
- `constants/`: Theme definitions and neon color palettes.
- `utils/`: Coordinate transformation and specialized helper functions.

---

> *Project maintained by @isink | Guided by Global Top-Tier Mobile Architect*
