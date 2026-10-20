import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";
import { getStorage } from "@react-native-firebase/storage";
import { Platform } from "react-native";
import {
  initializeAppCheck as initializeNativeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from "@react-native-firebase/app-check";

const firebaseApp = getApp();

if (Platform.OS !== "web") {
  try {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: {
        provider: __DEV__ ? "debug" : "playIntegrity",
      },
      apple: {
        provider: __DEV__ ? "debug" : "appAttest",
      },
    });
    initializeNativeAppCheck(firebaseApp, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn("Native AppCheck initialization error:", e);
  }
}

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

export { firebaseApp as app, auth, db, storage };
