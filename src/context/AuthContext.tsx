import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { hashPassword } from "../utils/crypto";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, pass: string) => Promise<void>;
  signUp: (
    identifier: string,
    pass: string,
    displayName?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Normalizes username or email input for Firebase Auth
 */
export function normalizeEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes("@")) {
    return trimmed;
  }
  // Standardized domain for username-only accounts
  return `${trimmed}@markx.app`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (identifier: string, pass: string) => {
    const email = normalizeEmail(identifier);
    const hashedPassword = await hashPassword(pass, email);
    await signInWithEmailAndPassword(auth, email, hashedPassword);
  };

  const signUp = async (
    identifier: string,
    pass: string,
    displayName?: string
  ) => {
    const email = normalizeEmail(identifier);
    const hashedPassword = await hashPassword(pass, email);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      hashedPassword
    );
    const name = displayName?.trim() || identifier.trim();
    if (userCredential.user && name) {
      await updateProfile(userCredential.user, {
        displayName: name,
      });
      setUser({ ...userCredential.user, displayName: name });
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
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
