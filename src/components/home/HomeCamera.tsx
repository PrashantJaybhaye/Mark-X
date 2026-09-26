import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
  BackHandler,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, usePhotoOutput, useVideoOutput, CommonResolutions } from "react-native-vision-camera";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  withSequence,
  runOnJS
} from "react-native-reanimated";


import { useAuth } from "../../context/AuthContext";
import { addGalleryPinToServer, updateGalleryPinInServer } from "../../services/galleryFirebaseService";
import { uploadFileToMarkx } from "../../services/cloudflareStorage";
import { GalleryPin, formatBytes } from "../../utils/galleryData";
import { loadCachedGalleryPins, saveCachedGalleryPins } from "../../services/storageService";
import { triggerHaptic } from "../../utils/haptics";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { deleteTempFile } from "../../services/cacheCleaner";

export function HomeCamera({ onClose }: { onClose?: () => void }) {
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();
  
  // Vision Camera: Pick the best default camera device for requested facing direction
  const device = useCameraDevice(cameraPosition);

  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [aspectRatio, setAspectRatio] = useState<"full" | "16:9" | "1:1">("full");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // AppState & Camera Lifecycle management
  const [appIsActive, setAppIsActive] = useState(true);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      setAppIsActive(nextAppState === "active");
    });

    return () => {
      subscription.remove();
      if (recorderRef.current) {
        recorderRef.current.stopRecording().catch(() => {});
      }
    };
  }, []);

  const isCameraActive = appIsActive && !previewUri;

  const cameraRef = useRef<any>(null);
  const recorderRef = useRef<any>(null);
  
  // Configure high-resolution photo capture (uncompressed quality) & video output
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.HIGHEST_4_3,
    quality: 1.0,
  });
  const videoOutput = useVideoOutput({
    targetResolution: CommonResolutions.FHD_16_9,
    enableAudio: true,
  });
  
  const { user } = useAuth();
  
  // Reanimated values for shutter interaction & focus
  const outerScale = useSharedValue(1);
  const innerScale = useSharedValue(1);
  const ringBorderWidth = useSharedValue(6);
  const isVideoMode = useSharedValue(0); 
  const screenFlash = useSharedValue(0);
  const focusScale = useSharedValue(1.3);
  const focusOpacity = useSharedValue(0);

  const outerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
    borderWidth: ringBorderWidth.value,
  }));

  const innerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: innerScale.value }],
    };
  });

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenFlash.value,
  }));

  const focusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusScale.value }],
    opacity: focusOpacity.value,
  }));

  const handleFocus = async (x: number, y: number) => {
    setFocusPoint({ x, y });
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    focusScale.value = 1.3;
    focusOpacity.value = 1;
    focusScale.value = withSpring(1, { damping: 14, stiffness: 220 });
    focusOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1200 }),
      withTiming(0, { duration: 300 })
    );

    try {
      if (cameraRef.current) {
        await cameraRef.current.focus({ x, y });
      }
    } catch (err) {
      // Focus not supported on this specific device/emulator
    }
  };

  const cameraTapGesture = Gesture.Tap()
    .onEnd((event) => {
      runOnJS(handleFocus)(event.x, event.y);
    });

  useEffect(() => {
    if (!hasPermission) requestPermission();
    if (!hasMicPermission) requestMicPermission();
  }, [hasPermission, hasMicPermission]);

  useEffect(() => {
    if (!previewUri) return;

    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowDiscardDialog(true);
      return true;
    });

    return () => backSubscription.remove();
  }, [previewUri]);

  const toggleCameraFacing = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setCameraPosition((current) => {
      const next = current === "back" ? "front" : "back";
      if (next === "front") {
        setFlash("off");
      }
      return next;
    });
  };

  const toggleFlash = () => {
    if (cameraPosition === "front") return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setFlash((f) => (f === "off" ? "on" : "off"));
  };

  const toggleAspectRatio = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setAspectRatio((current) => {
      if (current === "full") return "16:9";
      if (current === "16:9") return "1:1";
      return "full";
    });
  };

  const getFlashIcon = () => {
    return flash === "on" ? "flash" : "flash-off";
  };

  const updateCachedPinStatus = async (pinId: string, status: "synced" | "failed", url?: string) => {
    try {
      const currentCached = await loadCachedGalleryPins();
      await saveCachedGalleryPins(
        currentCached.map((p) =>
          p.id === pinId
            ? { ...p, uploadStatus: status, ...(url ? { imageUrl: url } : {}) }
            : p
        )
      );
    } catch (err) {
      // ignore
    }
  };

  const handleMediaCaptured = async (media: { uri: string, width: number, height: number }, type: "image" | "video") => {
    const isVideo = type === "video";
    const defaultMime = isVideo ? "video/mp4" : "image/jpeg";
    const timestampNow = Date.now();
    const shortFileName = `${timestampNow}${isVideo ? ".mp4" : ".jpg"}`;
    const newPinId = `pin-${timestampNow}`;
    
    const actualWidth = media.width || 1080;
    const actualHeight = media.height || 1920;
    const calculatedRatio = aspectRatio === "full"
      ? 0.6
      : aspectRatio === "1:1"
      ? 1
      : aspectRatio === "16:9"
      ? 0.75
      : Math.max(Math.min(actualWidth / actualHeight, 1.4), 0.6);
    const fileSize = isVideo ? 15000000 : 3000000;

    const newPin: GalleryPin = {
      id: newPinId,
      fileName: shortFileName,
      author: user?.displayName || "You",
      imageUrl: media.uri,
      mediaType: type,
      aspectRatio: calculatedRatio,
      width: actualWidth,
      height: actualHeight,
      fileSize,
      fileSizeFormatted: formatBytes(fileSize),
      mimeType: defaultMime,
      likes: 0,
      isLiked: false,
      saved: false,
      uploadStatus: "uploading",
    };

    await addGalleryPinToServer(newPin);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await uploadFileToMarkx(media.uri, defaultMime, shortFileName);
      if (res.success && res.url) {
        await updateGalleryPinInServer(newPin.id, {
          imageUrl: res.url,
          uploadStatus: "synced",
        });
        await updateCachedPinStatus(newPin.id, "synced", res.url);
      } else {
        await updateCachedPinStatus(newPin.id, "failed");
      }
    } catch {
      await updateCachedPinStatus(newPin.id, "failed");
    }
  };

  const cropToAspectRatio = async (uri: string, width: number, height: number) => {
    if (aspectRatio === "full") {
      return { uri, width, height };
    }

    let targetW = 3024;
    let targetH = 4032;

    if (aspectRatio === "16:9") {
      targetW = 3024;
      targetH = 4032;
    } else if (aspectRatio === "1:1") {
      targetW = 2268;
      targetH = 2268;
    }

    const targetRatio = targetW / targetH;
    const originalRatio = width / height;

    let cropW = width;
    let cropH = height;

    if (originalRatio > targetRatio) {
      cropW = Math.round(height * targetRatio);
    } else if (originalRatio < targetRatio) {
      cropH = Math.round(width / targetRatio);
    }

    const originX = Math.floor((width - cropW) / 2);
    const originY = Math.floor((height - cropH) / 2);

    const result = await manipulateAsync(
      uri,
      [
        { crop: { originX, originY, width: cropW, height: cropH } },
        { resize: { width: targetW, height: targetH } },
      ],
      { compress: 1, format: SaveFormat.JPEG }
    );
    return { uri: result.uri, width: targetW, height: targetH };
  };

  const takePhoto = async () => {
    if (cameraRef.current && !isRecording && !isCapturing) {
      try {
        setIsCapturing(true);
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

        innerScale.value = withSequence(
          withTiming(0.85, { duration: 90 }),
          withSpring(1)
        );

        screenFlash.value = withSequence(
          withTiming(0.95, { duration: 40 }),
          withTiming(0, { duration: 220 })
        );

        const photo = await photoOutput.capturePhoto(
          {
            flashMode: cameraPosition === "back" ? flash : "off",
            enableDistortionCorrection: true,
            enableVirtualDeviceFusion: true,
          },
          {}
        );

        if (photo) {
          const path = await photo.saveToTemporaryFileAsync();
          const rawUri = `file://${path}`;
          const cropped = await cropToAspectRatio(rawUri, photo.width, photo.height);
          setPendingMedia(cropped);
          setPreviewUri(cropped.uri);
          photo.dispose();
          // Only clean up raw temp file if cropping generated a separate new file
          if (cropped.uri !== rawUri) {
            deleteTempFile(rawUri);
          }
        }
      } catch (error) {
        console.warn("Failed to take photo", error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const startVideo = async () => {
    if (!isRecording) {
      setIsRecording(true);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

      outerScale.value = withSpring(1.3, { damping: 15 });
      ringBorderWidth.value = withSpring(3);
      innerScale.value = withSpring(0.7);
      isVideoMode.value = withTiming(1, { duration: 200 });

      const recorder = await videoOutput.createRecorder({});
      recorderRef.current = recorder;

      await recorder.startRecording(
        (filePath: string) => {
          resetAnimations();
          handleMediaCaptured({ 
            uri: `file://${filePath}`, 
            width: 1080, 
            height: 1920 
          }, "video");
        },
        (error: any) => {
          console.error("Recording failed", error);
          resetAnimations();
        }
      );
    }
  };

  const stopVideo = async () => {
    if (isRecording && recorderRef.current) {
      await recorderRef.current.stopRecording();
      recorderRef.current = null;
      // resetAnimations is called in onRecordingFinished
    }
  };

  const resetAnimations = () => {
    setIsRecording(false);
    outerScale.value = withSpring(1);
    ringBorderWidth.value = withSpring(6);
    innerScale.value = withSpring(1);
    isVideoMode.value = withTiming(0);
  };

  const tap = Gesture.Tap()
    .onStart(() => {
      innerScale.value = withTiming(0.85, { duration: 100 });
      runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      innerScale.value = withSpring(1);
      runOnJS(takePhoto)();
    });

  const longPress = Gesture.LongPress()
    .minDuration(350)
    .onStart(() => {
      runOnJS(startVideo)();
    })
    .onEnd(() => {
      runOnJS(stopVideo)();
    });

  const composedGestures = Gesture.Race(longPress, tap);

  const handleUsePhoto = () => {
    if (pendingMedia) {
      handleMediaCaptured(pendingMedia, "image");
    }
    setPreviewUri(null);
    setPendingMedia(null);
  };

  const handleDiscardDirect = () => {
    if (pendingMedia?.uri) {
      deleteTempFile(pendingMedia.uri);
    }
    setShowDiscardDialog(false);
    setPreviewUri(null);
    setPendingMedia(null);
  };

  const handleRetake = () => {
    setShowDiscardDialog(true);
  };

  if (!hasPermission || !hasMicPermission) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Text className="text-black text-center mb-6 font-outfit-medium text-lg">
          Camera access is required
        </Text>
        <TouchableOpacity
          onPress={async () => {
            await requestPermission();
            await requestMicPermission();
          }}
          className="bg-black px-8 py-3 rounded-full"
        >
          <Text className="text-white font-outfit-bold text-base">Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return <View className="flex-1 bg-black" />;
  }

  const cameraContainerStyle = aspectRatio === "1:1"
    ? { width: "100%" as const, aspectRatio: 1, overflow: "hidden" as const }
    : aspectRatio === "16:9"
    ? { width: "100%" as const, aspectRatio: 0.75, overflow: "hidden" as const }
    : StyleSheet.absoluteFill;

  if (previewUri) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
        <StatusBar style="light" />

        <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: 'black' }}>
          {/* Main Content Area (Rounded Photo Card with Black Background) */}
          <View className="flex-1 w-full px-3 pt-1 pb-3">
            <View 
              className="flex-1 w-full rounded-[28px] overflow-hidden relative bg-black items-center justify-center border border-white/10"
            >
              <View style={cameraContainerStyle}>
                <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              </View>

              {/* Top Bar on Image Card */}
              <View className="w-full flex-row justify-between items-center px-5 pt-4 absolute top-0 left-0 right-0 z-20" pointerEvents="box-none">
                <TouchableOpacity 
                  onPress={handleRetake} 
                  activeOpacity={0.7} 
                  className="w-10 h-10 bg-black/50 rounded-full items-center justify-center backdrop-blur-md border border-white/10"
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.7} 
                  className="w-10 h-10 bg-black/50 rounded-full items-center justify-center backdrop-blur-md border border-white/10"
                >
                  <Ionicons name="ellipsis-horizontal" size={22} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Bottom Control Bar Below Photo Card */}
          <View className="w-full px-6 py-3 flex-row items-center justify-between bg-black">
            {/* Left Dark Button: Retake */}
            <TouchableOpacity 
              onPress={handleRetake} 
              activeOpacity={0.75} 
              className="bg-[#222222] px-7 py-3 rounded-full items-center justify-center"
            >
              <Text className="text-white font-outfit-bold text-base">Retake</Text>
            </TouchableOpacity>

            {/* Right White Button: Use Photo > */}
            <TouchableOpacity 
              onPress={handleUsePhoto} 
              activeOpacity={0.8} 
              className="bg-white px-7 py-3 rounded-full flex-row items-center gap-1.5 shadow-lg"
            >
              <Text className="text-black font-outfit-bold text-base">Use Photo</Text>
              <Ionicons name="chevron-forward" size={18} color="black" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* iOS-Styled Confirmation Dialog Modal */}
        <Modal
          transparent
          visible={showDiscardDialog}
          animationType="fade"
          onRequestClose={() => setShowDiscardDialog(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowDiscardDialog(false)}
            className="flex-1 bg-black/60 items-center justify-center px-8"
          >
            <TouchableOpacity
              activeOpacity={1}
              className="w-full max-w-[280px] bg-[#252525] rounded-[18px] overflow-hidden border border-white/10 shadow-2xl"
            >
              {/* Header */}
              <View className="pt-5 pb-4 px-5 items-center">
                <Text className="text-white font-outfit-bold text-lg text-center mb-1">
                  Unsaved Photo
                </Text>
                <Text className="text-gray-300 font-outfit text-xs text-center leading-4">
                  What would you like to do with this photo?
                </Text>
              </View>

              {/* iOS Style Action List */}
              <View className="border-t border-white/10">
                {/* Save Photo */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowDiscardDialog(false);
                    handleUsePhoto();
                  }}
                  className="py-3.5 items-center justify-center border-b border-white/10 active:bg-white/10"
                >
                  <Text className="text-[#3B82F6] font-outfit-bold text-base">
                    Save Photo
                  </Text>
                </TouchableOpacity>

                {/* Discard Photo */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDiscardDirect}
                  className="py-3.5 items-center justify-center border-b border-white/10 active:bg-white/10"
                >
                  <Text className="text-[#EF4444] font-outfit-semibold text-base">
                    Discard Photo
                  </Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowDiscardDialog(false)}
                  className="py-3.5 items-center justify-center active:bg-white/10"
                >
                  <Text className="text-gray-400 font-outfit-medium text-base">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar style="light" />

      {/* Main Camera Feed */}
      <View style={{ flex: 1, width: "100%", position: "relative", backgroundColor: "black", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <GestureDetector gesture={cameraTapGesture}>
          <View style={cameraContainerStyle}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isCameraActive}
              resizeMode="cover"
              torchMode={cameraPosition === "back" && device?.hasFlash ? flash : "off"}
              enableNativeTapToFocusGesture={true}
              outputs={[photoOutput]}
              onError={(error) => {
                if (
                  error?.message?.includes("OperationCanceledException") || 
                  error?.message?.includes("not active") ||
                  error?.message?.includes("No flash unit") ||
                  error?.message?.includes("IllegalStateException")
                ) return;
                console.error("Camera runtime error:", error);
              }}
            />
            {focusPoint ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    left: focusPoint.x - 32,
                    top: focusPoint.y - 32,
                    width: 64,
                    height: 64,
                    borderWidth: 1.5,
                    borderColor: "#EAB308",
                    borderRadius: 8,
                    zIndex: 40,
                  },
                  focusAnimatedStyle,
                ]}
              />
            ) : null}
          </View>
        </GestureDetector>

        <Animated.View 
          style={[StyleSheet.absoluteFill, flashAnimatedStyle, { backgroundColor: 'white', zIndex: 50 }]} 
          pointerEvents="none" 
        />

        {/* Overlay Controls */}
        <SafeAreaView edges={["top"]} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Top Icons */}
          <View className="w-full flex-row justify-between items-center px-6 pt-4" pointerEvents="box-none">
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>

            <View className="flex-row items-center gap-5">
              {cameraPosition === "back" && (
                <TouchableOpacity onPress={toggleFlash} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                  <Ionicons 
                    name={getFlashIcon()} 
                    size={24} 
                    color={flash === "on" ? "#EAB308" : "white"} 
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                onPress={toggleAspectRatio}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons 
                  name={aspectRatio === "1:1" ? "square-outline" : aspectRatio === "16:9" ? "crop-outline" : "scan-outline"} 
                  size={24} 
                  color={aspectRatio !== "full" ? "#EAB308" : "white"} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Icons (over camera feed) */}
          <View className="absolute bottom-6 w-full flex-row justify-between items-center px-10" pointerEvents="box-none">
            <TouchableOpacity activeOpacity={0.7}>
              <Ionicons name="images" size={30} color="white" />
            </TouchableOpacity>

            <GestureDetector gesture={composedGestures}>
              <Animated.View 
                style={outerAnimatedStyle}
                className="w-[78px] h-[78px] rounded-full border-[3.5px] border-white items-center justify-center bg-transparent p-[3px]"
              >
                <Animated.View 
                  style={innerAnimatedStyle}
                  className="w-full h-full rounded-full bg-white"
                />
              </Animated.View>
            </GestureDetector>

            <TouchableOpacity onPress={toggleCameraFacing} activeOpacity={0.7}>
              <Ionicons name="camera-reverse" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom SafeArea Bar */}
      <SafeAreaView edges={["bottom"]} className="bg-black">
        <View className="w-full py-6 items-center justify-center">
          <Text className="text-white text-[13px]">Tap for photo</Text>
        </View>
      </SafeAreaView>

    </GestureHandlerRootView>
  );
}
