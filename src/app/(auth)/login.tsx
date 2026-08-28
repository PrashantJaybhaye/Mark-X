import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../services/firebase";
import { triggerHaptic } from "../../utils/haptics";

type AuthMode = "signin" | "signup";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  // Auto-dismiss feedback message after 4 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
      setIsResetSuccess(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleModeSwitch = (newMode: AuthMode) => {
    if (mode === newMode) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    setErrorMessage(null);
    setIsResetSuccess(false);
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
      default:
        return error?.message || "An unexpected error occurred. Please try again.";
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier.trim()) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setIsResetSuccess(false);
      setErrorMessage("Please enter your email above to reset password.");
      return;
    }

    try {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      setIsLoading(true);
      setErrorMessage(null);
      await resetPassword(identifier);
      setIsResetSuccess(true);
      setErrorMessage("Password reset link sent! Check your inbox.");
    } catch (err: any) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setIsResetSuccess(false);
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      setIsLoading(true);
      setErrorMessage(null);
      setIsResetSuccess(false);
      await signInWithGoogle();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setIsResetSuccess(false);
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
        if (auth.currentUser && !auth.currentUser.emailVerified) {
          router.replace("/(auth)/verify-email");
          return;
        }
      } else {
        await signUp(identifier, password, displayName);
        router.replace("/(auth)/verify-email");
        return;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setPassword("");
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: Math.max(insets.top, 16) + 4,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Nav Spacing */}
          <View className="h-11 mb-4" />

          {/* Header Branding */}
          <View className="items-center mb-8 px-2">
            <Text
              allowFontScaling={false}
              className="text-[36px] text-white tracking-[3.5px] text-center leading-[42px] mb-2 uppercase"
              style={{ fontFamily: "Outfit_900Black" }}
            >
              MARK X
            </Text>
            <Text
              allowFontScaling={false}
              className="text-[15px] text-[#8E8E93] text-center leading-[21px] max-w-[290px]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              {mode === "signin"
                ? "Your intelligent digital workspace"
                : "Create your precision workspace"}
            </Text>
          </View>

          {/* Status / Error Notice */}
          <View className="h-5 min-h-[20px] justify-center items-center mb-4 px-2">
            <Text
              allowFontScaling={false}
              className={`text-[13px] text-center leading-[18px] ${
                isResetSuccess ? "text-[#30D158]" : "text-[#FF453A]"
              } ${!errorMessage ? "opacity-0" : "opacity-100"}`}
              style={{ fontFamily: "Outfit_500Medium" }}
            >
              {errorMessage || " "}
            </Text>
          </View>

          {/* Form Fields */}
          <View className="gap-3 mb-2">
            {/* Optional Full Name (Sign Up Only) */}
            {mode === "signup" && (
              <View className="gap-1.5">
                <Text
                  allowFontScaling={false}
                  className="text-[13px] text-[#8E8E93]"
                  style={{ fontFamily: "Outfit_500Medium" }}
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
                  className="h-11 rounded-[10px] bg-[#141416] border border-white/[0.12] px-3.5 text-white text-[15px]"
                  style={{ fontFamily: "Outfit_400Regular" }}
                  allowFontScaling={false}
                />
              </View>
            )}

            {/* Email Field */}
            <View className="gap-1.5">
              <Text
                allowFontScaling={false}
                className="text-[13px] text-[#8E8E93]"
                style={{ fontFamily: "Outfit_500Medium" }}
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
                className="h-11 rounded-[10px] bg-[#141416] border border-white/[0.12] px-3.5 text-white text-[15px]"
                style={{ fontFamily: "Outfit_400Regular" }}
                allowFontScaling={false}
              />
            </View>

            {/* Password Field */}
            <View className="gap-1.5">
              <Text
                allowFontScaling={false}
                className="text-[13px] text-[#8E8E93]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Password
              </Text>
              <View className="relative justify-center">
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
                  className="h-11 rounded-[10px] bg-[#141416] border border-white/[0.12] pl-3.5 pr-14 text-white text-[15px]"
                  style={{ fontFamily: "Outfit_400Regular" }}
                  allowFontScaling={false}
                />
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setShowPassword((prev) => !prev);
                  }}
                  activeOpacity={0.65}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  className="absolute right-3.5 py-1 px-1"
                >
                  <Text
                    allowFontScaling={false}
                    className="text-[13px] text-[#8E8E93]"
                    style={{ fontFamily: "Outfit_500Medium" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Forgot Password Link */}
          {mode === "signin" && (
            <View className="items-end mb-5">
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={isLoading}
                activeOpacity={0.65}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="py-1 px-0.5"
              >
                <Text
                  allowFontScaling={false}
                  className="text-[13px] text-[#8E8E93]"
                  style={{ fontFamily: "Outfit_500Medium" }}
                >
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
            className={`h-11 rounded-[10px] bg-white items-center justify-center mb-4 active:bg-white/90 ${
              mode === "signup" ? "mt-6" : ""
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text
                allowFontScaling={false}
                className="text-[16px] text-black tracking-tight"
                style={{ fontFamily: "Outfit_700Bold" }}
              >
                {mode === "signin" ? "Log In" : "Sign Up"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center gap-3.5 mb-4">
            <View className="flex-1 h-[1px] bg-white/[0.12]" />
            <Text
              allowFontScaling={false}
              className="text-[13px] text-[#636366]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              or
            </Text>
            <View className="flex-1 h-[1px] bg-white/[0.12]" />
          </View>

          {/* Google Sign In */}
          <View className="mb-5">
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.75}
              className="h-11 rounded-[10px] bg-black border border-white/[0.14] flex-row items-center justify-center gap-2.5 active:bg-white/5"
            >
              <Image
                source={require("../../../assets/images/google.png")}
                className="w-[18px] h-[18px]"
                resizeMode="contain"
              />
              <Text
                allowFontScaling={false}
                className="text-[14px] text-white tracking-tight"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                Continue with Google
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switch Toggle */}
          <View className="items-center py-1.5">
            <Pressable
              onPress={() =>
                handleModeSwitch(mode === "signin" ? "signup" : "signin")
              }
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
              className="py-1.5 px-3"
            >
              <Text
                allowFontScaling={false}
                className="text-[14px] text-[#8E8E93] text-center"
                style={{ fontFamily: "Outfit_400Regular" }}
              >
                {mode === "signin"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text
                  className="text-white"
                  style={{ fontFamily: "Outfit_700Bold" }}
                >
                  {mode === "signin" ? "Sign up" : "Log in"}
                </Text>
              </Text>
            </Pressable>
          </View>

          {/* Spacer */}
          <View className="flex-1 min-h-[20px]" />

          {/* Legal / Terms */}
          <View className="items-center pt-2">
            <Text
              allowFontScaling={false}
              className="text-[12px] text-[#636366] text-center leading-[18px]"
              style={{ fontFamily: "Outfit_400Regular" }}
            >
              By continuing, you agree to our{" "}
              <Text
                className="text-[#8E8E93]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                className="text-[#8E8E93]"
                style={{ fontFamily: "Outfit_500Medium" }}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
