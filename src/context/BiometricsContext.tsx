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
  isSystemBypassActive,
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

  const clearAuthFlag = () =>
    setTimeout(() => { isAuthenticatingRef.current = false; }, 500);

  const refreshCapability = async () => {
    const cap = await checkBiometricsCapability();
    setCapability(cap);
  };

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

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {

      if (isAuthenticatingRef.current || isSystemBypassActive) return;

      if (nextAppState === "background" || nextAppState === "inactive") {
        if (lastBackgroundTime.current === null) {
          lastBackgroundTime.current = Date.now();
        }
        if (isBiometricsEnabled && user && lockTimeoutMinutes === 0) {
          setIsLockedState(true);
        }
      } else if (nextAppState === "active") {
        if (
          lastBackgroundTime.current !== null &&
          isBiometricsEnabled &&
          user
        ) {
          const elapsedMinutes = (Date.now() - lastBackgroundTime.current) / (1000 * 60);
          if (elapsedMinutes >= lockTimeoutMinutes) {
            setIsLockedState(true);
          }
        }
        lastBackgroundTime.current = null;
      }
    };

    if (!user) {
      lastBackgroundTime.current = null;
    }

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isBiometricsEnabled, lockTimeoutMinutes, user]);

  const unlockApp = async (): Promise<BiometricAuthResult> => {
    if (!capability?.hasHardware || !capability?.isEnrolled) {

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
      clearAuthFlag();
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

      if (!enabled) {
        setIsLockedState(false);
      }

      return { success: true };
    } finally {
      clearAuthFlag();
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
