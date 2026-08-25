import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Vibration,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../context/AuthContext";

type AuthMode = "signin" | "signup";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerHaptic = async (
    style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
  ) => {
    try {
      await Haptics.impactAsync(style);
    } catch {
      Vibration.vibrate(15);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    setErrorMessage(null);
  };

  const parseFirebaseError = (error: any): string => {
    const code = error?.code || "";
    switch (code) {
      case "auth/invalid-email":
      case "auth/invalid-credential":
        return "Invalid username or password.";
      case "auth/user-not-found":
        return "Account does not exist.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/email-already-in-use":
        return "This username or email is already registered.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/network-request-failed":
        return "Network connection issue. Please check your internet.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      default:
        return error?.message || "An unexpected error occurred. Please try again.";
    }
  };

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setErrorMessage("Please enter your username or email.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === "signin") {
        await signIn(identifier, password);
      } else {
        await signUp(identifier, password, displayName);
      }
      // Successfully authenticated
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Navigation */}
          <View className="flex-row items-center justify-between mb-8">
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/");
                }
              }}
              activeOpacity={0.7}
              className="size-10 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A]"
            >
              <Text style={styles.backIconText}>‹</Text>
            </TouchableOpacity>

            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={styles.headerBrand}
            >
              MARK X
            </Text>

            <View className="size-10" />
          </View>

          {/* Mode Switcher Tabs */}
          <View className="flex-row bg-[#161616] p-1 rounded-2xl border border-[#262626] mb-8">
            <TouchableOpacity
              onPress={() => handleModeSwitch("signin")}
              activeOpacity={0.8}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${
                mode === "signin" ? "bg-white" : "bg-transparent"
              }`}
            >
              <Text
                allowFontScaling={false}
                style={[
                  styles.tabText,
                  mode === "signin" ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleModeSwitch("signup")}
              activeOpacity={0.8}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${
                mode === "signup" ? "bg-white" : "bg-transparent"
              }`}
            >
              <Text
                allowFontScaling={false}
                style={[
                  styles.tabText,
                  mode === "signup" ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title and Subtitle */}
          <View className="mb-8">
            <Text
              allowFontScaling={false}
              style={styles.headingTitle}
            >
              {mode === "signin" ? "Welcome Back" : "Join Mark X"}
            </Text>
            <Text
              allowFontScaling={false}
              style={styles.headingSubtitle}
            >
              {mode === "signin"
                ? "Enter your credentials to access your account"
                : "Sign up with your username and password to get started"}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View className="bg-[#2D1214] border border-[#7A272A] px-4 py-3 rounded-xl mb-6 flex-row items-center">
              <Text style={styles.errorIcon}>!</Text>
              <Text
                allowFontScaling={false}
                style={styles.errorText}
              >
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View className="gap-5 mb-8">
            {mode === "signup" && (
              <View>
                <Text style={styles.label}>Full Name (Optional)</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g. Alex Mercer"
                  placeholderTextColor="#666666"
                  autoCapitalize="words"
                  style={styles.input}
                  allowFontScaling={false}
                />
              </View>
            )}

            <View>
              <Text style={styles.label}>Username or Email</Text>
              <TextInput
                value={identifier}
                onChangeText={(val) => {
                  setIdentifier(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter username or email"
                placeholderTextColor="#666666"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                allowFontScaling={false}
              />
            </View>

            <View>
              <Text style={styles.label}>Password</Text>
              <View className="relative justify-center">
                <TextInput
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#666666"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { paddingRight: 60 }]}
                  allowFontScaling={false}
                />
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    setShowPassword((prev) => !prev);
                  }}
                  activeOpacity={0.7}
                  className="absolute right-4 px-1 py-2"
                >
                  <Text style={styles.showHideText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
            className={`h-14 rounded-full items-center justify-center mb-6 ${
              isLoading ? "bg-[#333333]" : "bg-white"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text
                allowFontScaling={false}
                style={styles.submitButtonText}
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Helper Footer */}
          <View className="flex-row justify-center items-center mt-auto pt-6">
            <Text style={styles.footerText}>
              {mode === "signin"
                ? "Don't have an account? "
                : "Already have an account? "}
            </Text>
            <TouchableOpacity
              onPress={() =>
                handleModeSwitch(mode === "signin" ? "signup" : "signin")
              }
              activeOpacity={0.7}
            >
              <Text style={styles.footerLink}>
                {mode === "signin" ? "Sign Up" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBrand: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
    letterSpacing: 2.5,
    color: "#FFFFFF",
  },
  backIconText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 26,
    textAlign: "center",
    marginTop: -2,
  },
  tabText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  tabTextActive: {
    color: "#0A0A0A",
  },
  tabTextInactive: {
    color: "#888888",
  },
  headingTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  headingSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#8E8E93",
  },
  label: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    letterSpacing: 0.2,
    color: "#A0A0A0",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
  },
  showHideText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: "#999999",
  },
  errorIcon: {
    color: "#FF453A",
    fontWeight: "bold",
    fontSize: 14,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#FF453A",
  },
  submitButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
    color: "#0A0A0A",
  },
  footerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "#777777",
  },
  footerLink: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },
});
