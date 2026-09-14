import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "./AuthContext";
import {
  checkBiometricsCapability,
  authenticateWithBiometrics,
  BiometricCapability,
  BiometricAuthResult,
} from "../services/biometricsService";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "../services/storageService";

interface BiometricsContextType {
  capability: BiometricCapability | null;
  isBiometricsEnabled: boolean;
  isLocked: boolean;
  lockTimeoutMinutes: number;
  isLoading: boolean;
  unlockApp: () => Promise<BiometricAuthResult>;
  lockApp: () => void;
  setBiometricsEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  setLockTimeout: (minutes: number) => Promise<void>;
  refreshCapability: () => Promise<void>;
}

const BiometricsContext = createContext<BiometricsContextType | undefined>(undefined);

export function BiometricsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [isBiometricsEnabled, setIsBiometricsEnabledState] = useState(false);
  const [lockTimeoutMinutes, setLockTimeoutMinutesState] = useState(0);
  const [isLockedState, setIsLockedState] = useState(false);
  const isLocked = Boolean(user && isLockedState);
  const [isLoading, setIsLoading] = useState(true);

  const lastBackgroundTime = useRef<number | null>(null);
  const isAuthenticatingRef = useRef<boolean>(false);

  // Synchronized refs for AppState listener to avoid recreating listeners on every state change
  const biometricsEnabledRef = useRef(isBiometricsEnabled);
  const lockTimeoutRef = useRef(lockTimeoutMinutes);
  const userRef = useRef(user);

  useEffect(() => {
    biometricsEnabledRef.current = isBiometricsEnabled;
    lockTimeoutRef.current = lockTimeoutMinutes;
    userRef.current = user;
  }, [isBiometricsEnabled, lockTimeoutMinutes, user]);

  const refreshCapability = async () => {
    const cap = await checkBiometricsCapability();
    setCapability(cap);
  };

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [cap, prefs] = await Promise.all([
          checkBiometricsCapability(),
          loadUserPreferences(),
        ]);

        if (!isMounted) return;

        setCapability(cap);
        const enabled = !!prefs.isBiometricsEnabled;
        setIsBiometricsEnabledState(enabled);
        setLockTimeoutMinutesState(prefs.lockTimeoutMinutes ?? 0);

        // If enabled and user is logged in, lock initially upon opening app
        if (enabled && user) {
          setIsLockedState(true);
        } else if (!user) {
          setIsLockedState(false);
        }
      } catch (e) {
        console.warn("[BiometricsContext] Init failed:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // AppState listener for background / foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Don't trigger background lock while the system biometric dialog is active
      if (isAuthenticatingRef.current) return;

      if (nextAppState === "background") {
        lastBackgroundTime.current = Date.now();
      } else if (nextAppState === "active") {
        if (
          lastBackgroundTime.current !== null &&
          biometricsEnabledRef.current &&
          userRef.current
        ) {
          const elapsedMinutes = (Date.now() - lastBackgroundTime.current) / (1000 * 60);
          if (elapsedMinutes >= lockTimeoutRef.current) {
            setIsLockedState(true);
          }
        }
        lastBackgroundTime.current = null;
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const unlockApp = async (): Promise<BiometricAuthResult> => {
    if (!capability?.hasHardware || !capability?.isEnrolled) {
      // Fallback: unlock if hardware became unavailable
      setIsLockedState(false);
      return { success: true };
    }

    isAuthenticatingRef.current = true;
    try {
      const result = await authenticateWithBiometrics({
        promptMessage: "Unlock Mark-X",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Device Passcode",
      });

      if (result.success) {
        setIsLockedState(false);
      }
      return result;
    } finally {
      // Short delay before clearing so AppState change on dialog dismiss doesn't re-lock
      setTimeout(() => {
        isAuthenticatingRef.current = false;
      }, 500);
    }
  };

  const lockApp = () => {
    if (isBiometricsEnabled && user) {
      setIsLockedState(true);
    }
  };

  const setBiometricsEnabled = async (
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (enabled) {
      const cap = capability || (await checkBiometricsCapability());
      setCapability(cap);

      if (!cap.hasHardware) {
        return {
          success: false,
          error: "Biometric hardware is not supported or available on this device.",
        };
      }

      if (!cap.isEnrolled) {
        return {
          success: false,
          error: "No biometrics enrolled. Please register your fingerprint or face in device settings.",
        };
      }
    }

    // Require biometric confirmation before toggling security state
    isAuthenticatingRef.current = true;
    try {
      const authResult = await authenticateWithBiometrics({
        promptMessage: enabled
          ? "Verify identity to enable Biometric Lock"
          : "Verify identity to disable Biometric Lock",
        cancelLabel: "Cancel",
      });

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.cancelled
            ? "Authentication cancelled."
            : authResult.error || "Verification failed.",
        };
      }

      setIsBiometricsEnabledState(enabled);
      await saveUserPreferences({ isBiometricsEnabled: enabled });

      // If disabled, unlock immediately
      if (!enabled) {
        setIsLockedState(false);
      }

      return { success: true };
    } finally {
      setTimeout(() => {
        isAuthenticatingRef.current = false;
      }, 500);
    }
  };

  const setLockTimeout = async (minutes: number) => {
    setLockTimeoutMinutesState(minutes);
    await saveUserPreferences({ lockTimeoutMinutes: minutes });
  };

  return (
    <BiometricsContext.Provider
      value={{
        capability,
        isBiometricsEnabled,
        isLocked,
        lockTimeoutMinutes,
        isLoading,
        unlockApp,
        lockApp,
        setBiometricsEnabled,
        setLockTimeout,
        refreshCapability,
      }}
    >
      {children}
    </BiometricsContext.Provider>
  );
}

export function useBiometrics() {
  const context = useContext(BiometricsContext);
  if (!context) {
    throw new Error("useBiometrics must be used within a BiometricsProvider");
  }
  return context;
}
