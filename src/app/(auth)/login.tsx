import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Vibration,
  StyleSheet,
  Image,
  Pressable,
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
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // iOS-style auto-dismiss error message after 3 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const triggerHaptic = async (
    style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
  ) => {
    try {
      await Haptics.impactAsync(style);
    } catch {
      Vibration.vibrate(Platform.OS === "android" ? 25 : 15);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    if (mode === newMode) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    setErrorMessage(null);
  };

  const parseFirebaseError = (error: any): string => {
    const code = error?.code || "";
    switch (code) {
      case "auth/invalid-email":
      case "auth/invalid-credential":
        return "Invalid email address or password.";
      case "auth/user-not-found":
        return "No account exists with this email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/network-request-failed":
        return "Network connection issue. Please check your internet.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again in a few minutes.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Google sign-in was cancelled.";
      case "auth/popup-blocked":
        return "Popup was blocked by browser. Please allow popups.";
      case "auth/account-exists-with-different-credential":
        return "An account already exists with the same email address.";
      default:
        return error?.message || "An unexpected error occurred. Please try again.";
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      setIsLoading(true);
      setErrorMessage(null);
      await signInWithGoogle();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setErrorMessage("Please enter your email.");
      return;
    }
    if (!password) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setErrorMessage("Please enter your password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
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
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setPassword(""); // Clear wrong password like native iOS
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flexOne}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 16) + 4,
              paddingBottom: Math.max(insets.bottom, 20) + 12,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Spacing Placeholder (Preserves exact layout structure) */}
          <View style={styles.topNav} />

          {/* Section 1: Header / Branding */}
          <View style={styles.brandHeader}>
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={styles.brandWordmark}
            >
              MARK X
            </Text>
            <Text
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={styles.brandSubtitle}
            >
              {mode === "signin"
                ? "Your intelligent digital workspace"
                : "Create your precision workspace"}
            </Text>
          </View>

          {/* iOS-First Inline Status/Error Notice (Fixed Placement - Prevents UI Shift) */}
          <View style={styles.errorContainer} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text
              allowFontScaling={false}
              style={[
                styles.errorText,
                !errorMessage && styles.errorTextHidden,
              ]}
            >
              {errorMessage || " "}
            </Text>
          </View>

          {/* Section 2: Login Form */}
          <View style={styles.formContainer}>
            {/* Optional Full Name Field (Sign Up Only) */}
            {mode === "signup" && (
              <View style={styles.fieldWrapper}>
                <Text
                  allowFontScaling={false}
                  style={styles.fieldLabel}
                >
                  Full Name
                </Text>
                <TextInput
                  value={displayName}
                  onChangeText={(val) => {
                    setDisplayName(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Alex Mercer"
                  placeholderTextColor="#71717A"
                  selectionColor="#FFFFFF"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={styles.textInput}
                  allowFontScaling={false}
                  accessibilityLabel="Full Name"
                />
              </View>
            )}

            {/* Email Field */}
            <View style={styles.fieldWrapper}>
              <Text
                allowFontScaling={false}
                style={styles.fieldLabel}
              >
                Email
              </Text>
              <TextInput
                value={identifier}
                onChangeText={(val) => {
                  setIdentifier(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="m@example.com"
                placeholderTextColor="#71717A"
                selectionColor="#FFFFFF"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                style={styles.textInput}
                allowFontScaling={false}
                accessibilityLabel="Email address"
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrapper}>
              <Text
                allowFontScaling={false}
                style={styles.fieldLabel}
              >
                Password
              </Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Password"
                  placeholderTextColor="#71717A"
                  selectionColor="#FFFFFF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  style={[
                    styles.textInput,
                    styles.passwordInput,
                  ]}
                  allowFontScaling={false}
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setShowPassword((prev) => !prev);
                  }}
                  activeOpacity={0.65}
                  style={styles.showHideButton}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text
                    allowFontScaling={false}
                    style={styles.showHideText}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Section 3: Forgot Password */}
          {mode === "signin" && (
            <View style={styles.forgotPasswordRow}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setErrorMessage("Password reset link will be sent to your email.");
                }}
                activeOpacity={0.65}
                style={styles.forgotPasswordButton}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  allowFontScaling={false}
                  style={styles.forgotPasswordText}
                >
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Section 4: Primary Action Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
            style={[
              styles.primaryButton,
              mode === "signup" && { marginTop: 24 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={mode === "signin" ? "Log In" : "Sign Up"}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text
                allowFontScaling={false}
                style={styles.primaryButtonText}
              >
                {mode === "signin" ? "Log In" : "Sign Up"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Section 5: Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text
              allowFontScaling={false}
              style={styles.dividerText}
            >
              or
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Section 6: Google Authentication */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.75}
              style={styles.googleButton}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Image
                source={require("../../../assets/images/google.png")}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text
                allowFontScaling={false}
                style={styles.googleButtonText}
              >
                Continue with Google
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section 7: Sign-Up / Mode Toggle */}
          <View style={styles.toggleContainer}>
            <Pressable
              onPress={() =>
                handleModeSwitch(mode === "signin" ? "signup" : "signin")
              }
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
              style={({ pressed }) => [
                styles.togglePressable,
                { opacity: pressed ? 0.65 : 1 },
              ]}
              accessibilityRole="button"
            >
              <Text
                allowFontScaling={false}
                style={styles.toggleMutedText}
              >
                {mode === "signin"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text style={styles.toggleHighlightText}>
                  {mode === "signin" ? "Sign up" : "Log in"}
                </Text>
              </Text>
            </Pressable>
          </View>

          {/* Flexible Bottom Spacer */}
          <View style={styles.spacer} />

          {/* Bottom Legal / Terms Notice (Inside Safe Area) */}
          <View style={styles.legalContainer}>
            <Text
              allowFontScaling={false}
              style={styles.legalText}
            >
              By continuing, you agree to our{" "}
              <Text style={styles.legalLink}>Terms of Service</Text>{" "}
              and{" "}
              <Text style={styles.legalLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topNav: {
    height: 44,
    marginBottom: 16,
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  brandWordmark: {
    fontFamily: "Outfit_900Black",
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 3.5,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  brandSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    lineHeight: 21,
    color: "#8E8E93",
    textAlign: "center",
    letterSpacing: 0.15,
    maxWidth: 290,
  },
  errorContainer: {
    minHeight: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  errorText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    lineHeight: 18,
    color: "#FF453A",
    textAlign: "center",
  },
  errorTextHidden: {
    opacity: 0,
  },
  formContainer: {
    gap: 16,
    marginBottom: 6,
  },
  fieldWrapper: {
    width: "100%",
  },
  fieldLabel: {
    fontFamily: "Outfit_500Medium",
    color: "#FFFFFF",
    fontSize: 14,
    letterSpacing: -0.1,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 10,
    borderCurve: "continuous",
    height: 44,
    paddingHorizontal: 14,
    paddingVertical: 0,
    color: "#FFFFFF",
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 56,
  },
  showHideButton: {
    position: "absolute",
    right: 12,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  showHideText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#8E8E93",
  },
  forgotPasswordRow: {
    alignItems: "flex-end",
    marginTop: 6,
    marginBottom: 20,
  },
  forgotPasswordButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotPasswordText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#8E8E93",
    letterSpacing: 0.1,
  },
  primaryButton: {
    height: 44,
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  primaryButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
    color: "#000000",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  dividerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "#636366",
  },
  socialContainer: {
    marginBottom: 20,
  },
  googleButton: {
    height: 44,
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    letterSpacing: -0.1,
    color: "#FFFFFF",
  },
  toggleContainer: {
    alignItems: "center",
    paddingVertical: 6,
  },
  togglePressable: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  toggleMutedText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  toggleHighlightText: {
    fontFamily: "Outfit_700Bold",
    color: "#FFFFFF",
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  legalContainer: {
    alignItems: "center",
    paddingTop: 8,
  },
  legalText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: "#636366",
    textAlign: "center",
  },
  legalLink: {
    fontFamily: "Outfit_500Medium",
    color: "#8E8E93",
  },
});
