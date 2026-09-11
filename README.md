# Mark-X 🚀

Mark-X is a unified productivity suite for Android, iOS, and Web, featuring an executive cloud vault, smart notes, creative inspiration board, and document drive.

## Features

- **Executive Cloud & Drive:** Fast document management, camera scanning, folder categorization, and file preview.
- **Smart Notes:** End-to-end encrypted notes with auto-pinning, category organization, and quick editing.
- **Creative Inspiration Gallery:** Pinterest-style masonry aesthetic inspiration feed with likes and saved collections.
- **Firebase Auth & Security:** Secure email authentication, Google Sign-in, CSPRNG cryptographic nonces, and session management.
- **Local Persistence:** Seamless offline persistence for files, notes, gallery items, and preferences.

## Tech Stack

- **Framework:** [Expo SDK 57](https://docs.expo.dev/) (React Native 0.86, React 19)
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing with Typed Routes)
- **Styling:** [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS)
- **Authentication & Backend:** [Firebase](https://firebase.google.com/) (Auth, Firestore, Cloud Storage)
- **Typography:** Outfit, Anton, Bebas Neue via `@expo-google-fonts`

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and provide your Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
```

### 3. Run Development Server

```bash
# Start Expo Metro bundler
npx expo start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

### 4. Code Quality & Linting

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint
```
