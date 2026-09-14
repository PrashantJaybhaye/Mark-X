# Mark-X 🚀

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057.0-000020?style=for-the-badge&logo=expo&logoColor=white)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19.2.3-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-v12.18-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/NativeWind-v4.2-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://www.nativewind.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Mark-X** is an executive-grade, unified personal productivity and cloud vault application engineered for **Android, iOS, and Web**. It seamlessly combines a high-speed document cloud drive, an encrypted smart note-taking engine, a creative Pinterest-style inspiration board, and enterprise-grade hardware device and biometric access management.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
  - [1. Executive Cloud & Document Drive](#1-executive-cloud--document-drive)
  - [2. Smart Notes with Continuous Sync](#2-smart-notes-with-continuous-sync)
  - [3. Inspiration Gallery](#3-inspiration-gallery)
  - [4. Biometric Security Gate](#4-biometric-security-gate)
  - [5. Active Devices Fleet Management](#5-active-devices-fleet-management)
  - [6. Authentication & User Profile](#6-authentication--user-profile)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Security & Data Isolation Architecture](#-security--data-isolation-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#1-installation)
  - [Environment Configuration](#2-environment-configuration)
  - [Firebase Setup & Security Rules](#3-firebase-setup--security-rules)
  - [Running the Development Server](#4-running-the-development-server)
- [Available Scripts](#-available-scripts)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Key Features

### 1. Executive Cloud & Document Drive
- **Storage Quota & Real-time Metrics:** Automatic calculation and visual telemetry of used storage versus quota allocations.
- **Universal File Management:** Upload, preview, categorize, rename, and securely delete files.
- **Extensive File Type Support:** Native support for PDFs, Office documents (DOCX, XLSX, PPTX), images, audio, video, archives (ZIP), and code files.
- **Camera & Picker Integration:** Direct capture via device camera or file selection using `expo-document-picker` and `expo-image-picker`.
- **Cloud Backing:** Backed by Firebase Cloud Storage with strict 25 MB per-file safety limits and owner UID path containment.

### 2. Smart Notes with Continuous Sync
- **Instant Autosave:** Debounced background synchronization ensuring zero data loss during note creation and editing.
- **Organization & Search:** Real-time keyword search across note titles and content with priority pinning to keep essential notes at the top.
- **Categorization:** Tagging and categorization system for project-based and personal workflows.
- **Offline Resiliency:** Scoped local cache storage enables instant load times even when disconnected from the network.

### 3. Inspiration Gallery
- **Masonry Visual Board:** High-performance responsive grid optimized for creative exploration and design research.
- **Curated Collections:** Like, bookmark, and curate personalized collections saved to your profile.
- **High-Resolution Inspection:** Detailed modal view with photographer attribution, color palettes, and tags.

### 4. Biometric Security Gate
- **Hardware-Level Authentication:** Integrates with `expo-local-authentication` supporting Apple Face ID, Touch ID, and Android Biometric Prompt.
- **App Lock Shield:** Dynamic security overlay requiring biometric verification upon app resume or timeout expiration.
- **Customizable Inactivity Timeouts:** Configure auto-lock thresholds (immediate, 1 minute, 5 minutes, 15 minutes).

### 5. Active Devices Fleet Management
- **Hardware Fingerprinting:** Collects device hardware model, manufacturer brand, platform OS, and build version using `expo-device`.
- **Live Device Heartbeat:** Real-time tracking of active sessions and last active timestamps stored in Firestore.
- **Remote Revocation:** Terminate unrecognized sessions or revoke access from lost devices directly from the user settings.

### 6. Authentication & User Profile
- **Dual Sign-in Support:** Firebase Email/Password authentication and Google Sign-in via `@react-native-google-signin/google-signin`.
- **Email Verification Guard:** Enforces email verification status before granting access to executive vaults.
- **Profile Customization:** Update personal information, bio, contact details, and avatar image with real-time Firestore sync.

---

## 🛠 Architecture & Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | [Expo SDK 57](https://docs.expo.dev/) | React Native 0.86.3, React 19.2.3, New Architecture ready |
| **Routing** | [Expo Router v57](https://docs.expo.dev/router/introduction/) | Typed file-based routing with Stack and Custom Bottom Tab navigators |
| **Styling** | [NativeWind v4](https://www.nativewind.dev/) | Tailwind CSS 3.4 styling engine tailored for React Native |
| **Backend & DB** | [Firebase v12](https://firebase.google.com/) | Firebase Authentication, Cloud Firestore, and Cloud Storage |
| **Security** | [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/) | CSPRNG UUID nonces, replay attack mitigation headers |
| **Biometrics** | [Expo Local Auth](https://docs.expo.dev/versions/latest/sdk/local-authentication/) | Face ID, Touch ID, Android Biometric Prompt |
| **Typography** | `@expo-google-fonts` | Outfit, Anton, Bebas Neue loaded asynchronously |
| **Haptics** | [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) | Micro-interaction tactile feedback on taps, deletes, and actions |
| **Local Cache** | `@react-native-async-storage` | Per-user scoped key-value persistent storage |

---

## 📁 Project Directory Structure

```
Mark-X/
├── assets/                     # Static media, icons, SVG assets, and fonts
│   ├── images/                 # App banners, icons, and SVG navigation glyphs
│   └── expo.icon/              # Generated app icon assets
├── src/
│   ├── app/                    # Expo Router file-based route hierarchy
│   │   ├── (auth)/             # Authentication group (login, verify-email)
│   │   ├── (main)/             # Core application tabs
│   │   │   ├── home.tsx        # Executive Dashboard & storage metrics
│   │   │   ├── drive.tsx       # Cloud file & folder management
│   │   │   ├── gallery.tsx     # Inspiration masonry board
│   │   │   ├── notes.tsx       # Smart notes list & quick actions
│   │   │   └── profile.tsx     # Account settings & security hub
│   │   ├── profile/            # Profile sub-routes
│   │   │   ├── devices.tsx     # Active devices fleet management
│   │   │   ├── personal-info.tsx # Profile detail editor
│   │   │   ├── security.tsx    # Security & biometric options
│   │   │   ├── help.tsx        # Help & customer support
│   │   │   ├── terms.tsx       # Terms & conditions
│   │   │   └── about.tsx       # About Mark-X details
│   │   ├── _layout.tsx         # Root application layout with providers
│   │   └── index.tsx           # Entry router dispatch
│   ├── components/             # Modular, reusable UI components
│   │   ├── common/             # Shared branding (e.g. MarkXLogo)
│   │   ├── drive/              # File lists, modals, action sheets, upload toasts
│   │   ├── gallery/            # Pin cards, detail modals, skeletons
│   │   ├── home/               # StorageHeroCard, FeatureCards, Visuals
│   │   ├── navigation/         # BottomTabBar with custom SVG icons
│   │   ├── notes/              # Note cards, edit modal, stacked banners
│   │   ├── profile/            # Profile header, setting rows
│   │   └── security/           # BiometricLockGate screen overlay
│   ├── context/                # React Context state management
│   │   ├── AuthContext.tsx     # User auth state, session handling, login/logout
│   │   └── BiometricsContext.tsx # Biometric hardware detection & lock state
│   ├── services/               # Core business logic and external integrations
│   │   ├── devices/            # Hardware detection & platform label resolution
│   │   ├── biometricsService.ts# Biometric scanner capability check & auth
│   │   ├── deviceSyncService.ts# Firestore device registration & heartbeat
│   │   ├── firebase.ts         # Firebase App, Auth, Firestore, and Storage init
│   │   ├── storageService.ts   # User-scoped AsyncStorage abstraction
│   │   └── userService.ts      # Profile fetching & metadata updates
│   ├── types/                  # TypeScript interfaces and type definitions
│   │   └── device.ts           # Hardware & device telemetry schemas
│   ├── utils/                  # Helper utilities
│   │   ├── crypto.ts           # CSPRNG nonce generator & transmission package
│   │   ├── driveFileTypes.ts   # MIME type mappings & file icon formatters
│   │   ├── galleryData.ts      # Gallery pin schemas and mock fallbacks
│   │   └── haptics.ts          # Safe haptic feedback triggers
│   └── global.css              # Tailwind CSS directives & theme extensions
├── firestore.rules             # Production security rules for Cloud Firestore
├── storage.rules               # Production security rules for Firebase Storage
├── tailwind.config.js          # Tailwind theme colors, fonts, and plugins
├── app.json                    # Expo application manifest & configuration
├── babel.config.js             # Babel compiler preset & NativeWind plugin
├── metro.config.js             # Metro bundler config with NativeWind wrapper
├── tsconfig.json               # TypeScript strict configuration
└── package.json                # Project dependencies and executable scripts
```

---

## 🔒 Security & Data Isolation Architecture

Mark-X is designed with a **defense-in-depth** security model:

1. **User Isolation in Cloud Firestore:**
   - Default deny on all collections.
   - Users are restricted to their own document subtree (`/users/{userId}/**`).
   - Dedicated collections (`/notes`, `/drive_items`, `/gallery_pins`) enforce `request.auth.uid == resource.data.userId` for every read, write, update, and delete operation.

2. **Cloud Storage Access Control:**
   - Isolated user directories: `/users/{userId}/**`.
   - Hard 25 MB per-file upload cap enforced at the Firebase Storage rule layer to eliminate cost and storage abuse.

3. **Replay-Resistant API Architecture:**
   - All network payloads are wrapped in a cryptographic envelope featuring a CSPRNG UUID v4 (`expo-crypto`) and high-precision UTC timestamp.
   - Prevents replay attacks, packet injection, and unauthorized data tampering.

4. **User-Scoped Local Storage:**
   - Local `AsyncStorage` keys are automatically namespaced with the active user's UID (`@markx_drive_items_v1_${uid}`).
   - Ensures zero cross-contamination when switching between accounts on a shared device.

---

## 🚀 Getting Started

### Prerequisites

Ensure the following tools are installed on your machine:
- [Node.js](https://nodejs.org/) (version `v18.x` or `v20.x` recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)
- **For Android Development:** Android Studio, Android SDK (API 34+), and an emulator or physical device with USB/wireless debugging enabled.
- **For iOS Development:** macOS with Xcode 15+ and CocoaPods.

### 1. Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/PrashantJaybhaye/Mark-X.git
cd Mark-X
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory by copying the example template:

```bash
cp .env.example .env.local
```

Populate the file with your Firebase and Google Sign-In credentials:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Sign-In (Web Client ID from Google Cloud Console)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
```

### 3. Firebase Setup & Security Rules

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Email/Password and Google providers).
3. Create a **Cloud Firestore** database and deploy the rules from [firestore.rules](file:///d:/Mark-X/firestore.rules):
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Create a **Cloud Storage** bucket and deploy the rules from [storage.rules](file:///d:/Mark-X/storage.rules):
   ```bash
   firebase deploy --only storage:rules
   ```

### 4. Running the Development Server

Start the local Expo development server:

```bash
# Start Metro bundler
npm run start
```

Run directly on your target platform:

```bash
# Run on Android device or emulator
npm run android

# Run on iOS simulator or device
npm run ios

# Run on Web browser
npm run web
```

---

## 📋 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run start` | Starts the interactive Expo Metro development server |
| `npm run android` | Compiles native code and launches the app on an Android device/emulator |
| `npm run ios` | Compiles native code and launches the app on an iOS simulator/device |
| `npm run web` | Launches the application as a responsive Progressive Web App |
| `npm run lint` | Runs ESLint using `eslint-config-expo` rules to verify code quality |
| `npx tsc --noEmit` | Executes TypeScript type checking across the entire project |

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve Mark-X:

1. **Fork** the repository.
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`.
3. **Commit your changes:** `git commit -m 'feat: add amazing new feature'`.
4. **Push to the branch:** `git push origin feature/amazing-feature`.
5. **Open a Pull Request** describing your additions or fixes.

Please ensure that `npx tsc --noEmit` and `npm run lint` pass before submitting your PR.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](file:///d:/Mark-X/LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by Prashant Jaybhaye • Powered by Expo SDK 57 & Firebase</sub>
</div>
