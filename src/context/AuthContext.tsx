import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  FirebaseAuthTypes,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "@react-native-firebase/auth";
import { Platform, AppState } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { auth } from "../services/firebase";
import { syncUserMetadata } from "../services/userService";
import { forceSyncAllStats } from "../services/storageService";
import {
  syncCurrentDevice,
  listenCurrentDeviceRevocation,
  touchDeviceHeartbeat,
  getPersistentDeviceId,
  getHardwareInfo,
} from "../services/deviceSyncService";

if (Platform.OS !== "web") {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ["profile", "email"],
    offlineAccess: false,
  });
}

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  signIn: (identifier: string, pass: string) => Promise<void>;
  signUp: (
    identifier: string,
    pass: string,
    displayName?: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (identifier: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
  signOut: () => Promise<void>;
  isSessionRevoked: boolean;
  dismissSessionRevoked: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function normalizeEmail(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionRevoked, setIsSessionRevoked] = useState(false);
  const dismissSessionRevoked = () => setIsSessionRevoked(false);

  const signOut = async () => {
    if (Platform.OS !== "web") {
      try {
        await GoogleSignin.signOut();
      } catch {}
      try {
        const cacheDir = FileSystem.cacheDirectory;
        if (cacheDir) {
          await FileSystem.deleteAsync(`${cacheDir}cached_assets/`, { idempotent: true }).catch(() => {});
          await FileSystem.deleteAsync(`${cacheDir}shared_incoming/`, { idempotent: true }).catch(() => {});
        }
      } catch {}
    }
    await firebaseSignOut(auth);
  };

  const deviceIdRef = useRef<string>("");

  useEffect(() => {
    let revocationUnsub: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        syncUserMetadata(currentUser);
        forceSyncAllStats().catch(console.warn);

        try {
          const deviceId = await getPersistentDeviceId();
          deviceIdRef.current = deviceId;
          const info = getHardwareInfo();
          await syncCurrentDevice(currentUser.uid, deviceId, info);

          if (revocationUnsub) revocationUnsub();
          revocationUnsub = listenCurrentDeviceRevocation(
            currentUser.uid,
            deviceId,
            () => {
              console.warn("[AuthContext] This device was logged out remotely.");
              setIsSessionRevoked(true);
              signOut().catch(console.warn);
            }
          );
        } catch (e) {
          console.warn("[AuthContext] Error setting up device session sync:", e);
        }
      } else {
        deviceIdRef.current = "";
        if (revocationUnsub) {
          revocationUnsub();
          revocationUnsub = undefined;
        }
      }
    });

    return () => {
      unsubscribe();
      if (revocationUnsub) revocationUnsub();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && deviceIdRef.current) {
        touchDeviceHeartbeat(user.uid, deviceIdRef.current);
      }
    });
    return () => subscription.remove();
  }, [user]);

  const signIn = async (identifier: string, pass: string) => {
    setIsSessionRevoked(false);
    const email = normalizeEmail(identifier);
    if (!email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (
    identifier: string,
    pass: string,
    displayName?: string
  ) => {
    const email = normalizeEmail(identifier);
    if (!email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      pass
    );
    const name = displayName?.trim() || identifier.trim();
    if (userCredential.user) {
      if (name) {
        await updateProfile(userCredential.user, {
          displayName: name,
        });
      }

      try {
        await sendEmailVerification(userCredential.user);
      } catch (e) {
        console.warn("Could not send verification email:", e);
      }

      await userCredential.user.reload();
      const updatedUser = auth.currentUser || userCredential.user;
      setUser(updatedUser);
      await syncUserMetadata(updatedUser, true);
    }
  };

  const signInWithGoogle = async () => {

    if (Platform.OS === "web" && typeof signInWithPopup === "function") {
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      return;
    }

    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const response = await GoogleSignin.signIn();
      const idToken =
        response.data?.idToken || (response as any).idToken;

      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In.");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          throw new Error("Google Sign-In was cancelled.");
        } else if (error.code === statusCodes.IN_PROGRESS) {
          throw new Error("Google Sign-In is already in progress.");
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error("Google Play Services not available or outdated.");
        }
      }
      throw error;
    }
  };

  const resetPassword = async (identifier: string) => {
    const email = normalizeEmail(identifier);
    if (!email || !email.includes("@")) {
      throw new Error("Please enter your full registered email address (e.g. yourname@gmail.com).");
    }
    await sendPasswordResetEmail(auth, email);
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async (): Promise<boolean> => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      setUser(updatedUser);
      syncUserMetadata(updatedUser);
      return updatedUser.emailVerified;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        resetPassword,
        sendVerificationEmail,
        reloadUser,
        signOut,
        isSessionRevoked,
        dismissSessionRevoked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
