import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { GalleryPin } from "../../utils/galleryData";
import { triggerHaptic } from "../../utils/haptics";
import { exportMediaToDevice } from "../../services/mediaExportService";
import { IosDialog } from "../common/IosDialog";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GalleryPinOptionsSheetProps {
  pin: GalleryPin | null;
  visible: boolean;
  onClose: () => void;
  onSaveToggle: (pinId: string) => void;
  onHidePin?: (pinId: string) => void;
  onExport?: (pin: GalleryPin) => void;
  onInfo?: (pin: GalleryPin) => void;
}

export function GalleryPinOptionsSheet({
  pin,
  visible,
  onClose,
  onSaveToggle,
  onHidePin,
  onExport,
  onInfo,
}: GalleryPinOptionsSheetProps) {
  const insets = useSafeAreaInsets();
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const lastPinRef = useRef<GalleryPin | null>(pin);
  if (pin) {
    lastPinRef.current = pin;
  }
  const activePin = pin || lastPinRef.current;

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible && !showExportSuccess && !showRemoveConfirm) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible, showExportSuccess, showRemoveConfirm]);

  const animateCloseOnly = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.();
    });
  };

  const animateClose = (callback?: () => void) => {
    animateCloseOnly(() => {
      onClose();
      callback?.();
    });
  };

  if (!activePin) return null;

  const isVideo = activePin.mediaType === "video";

  const handleExport = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (onExport) {
      animateClose(() => onExport(activePin));
      return;
    }
    animateCloseOnly(async () => {
      const result = await exportMediaToDevice(activePin.imageUrl, activePin.fileName);
      if (result?.success) {
        setShowExportSuccess(true);
      } else {
        onClose();
      }
    });
  };

  const handleSave = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    animateClose(() => onSaveToggle(activePin.id));
  };

  const handleRemovePress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    animateCloseOnly(() => {
      setShowRemoveConfirm(true);
    });
  };

  const handleConfirmRemove = () => {
    setShowRemoveConfirm(false);
    if (activePin) {
      onHidePin?.(activePin.id);
    }
    onClose();
  };

  const handleCancelRemove = () => {
    setShowRemoveConfirm(false);
    onClose();
  };

  const handleInfo = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    animateClose(() => onInfo?.(activePin));
  };

  return (
    <>
      <Modal
        visible={visible && !showExportSuccess && !showRemoveConfirm}
        animationType="none"
        transparent
        onRequestClose={() => animateClose()}
      >
        <View className="flex-1 justify-end">
          {/* Animated Backdrop Fade Overlay */}
          <TouchableWithoutFeedback onPress={() => animateClose()}>
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.45)",
                opacity: backdropOpacity,
              }}
            />
          </TouchableWithoutFeedback>

          {/* Animated Sheet Container */}
          <TouchableWithoutFeedback>
            <Animated.View
              className="bg-[#F5F4F0] rounded-t-[32px] px-5 pt-4 shadow-2xl relative border-t border-black/[0.05]"
              style={{
                transform: [{ translateY: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 20) + 8,
              }}
            >
              {/* Centered Floating Preview Thumbnail Card */}
              <View className="items-center mb-1">
                <View className="-mt-24 rounded-[22px] shadow-2xl overflow-hidden bg-[#E7E4DC]">
                  <Image
                    source={{ uri: activePin.imageUrl }}
                    style={{ width: 110, height: 155 }}
                    contentFit="cover"
                  />
                  {isVideo && (
                    <View className="absolute inset-0 bg-black/25 items-center justify-center">
                      <Ionicons name="play" size={26} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </View>

              {/* 2 Main Action Cards Row */}
              <View className="flex-row gap-3 my-4">
                {/* Save / Bookmark Card */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleSave}
                  className="flex-1 bg-[#E7E4DC] active:bg-[#DCD8CD] py-3.5 px-4 rounded-[20px] items-center justify-center border border-black/[0.04]"
                >
                  <Ionicons
                    name={activePin.saved ? "bookmark" : "bookmark-outline"}
                    size={22}
                    color={activePin.saved ? "#FF9500" : "#1C1C1E"}
                    style={{ marginBottom: 4 }}
                  />
                  <Text allowFontScaling={false} className="text-[14px] font-outfit-semibold text-[#1C1C1E]">
                    {activePin.saved ? "Saved" : "Save Pin"}
                  </Text>
                </TouchableOpacity>

                {/* Remove Pin Card */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleRemovePress}
                  className="flex-1 bg-[#E7E4DC] active:bg-[#DCD8CD] py-3.5 px-4 rounded-[20px] items-center justify-center border border-black/[0.04]"
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color="#1C1C1E"
                    style={{ marginBottom: 4 }}
                  />
                  <Text allowFontScaling={false} className="text-[14px] font-outfit-semibold text-[#1C1C1E]">
                    Remove Pin
                  </Text>
                </TouchableOpacity>
              </View>

              {/* List Action Rows Below */}
              <View className="gap-0.5 mt-1">
                {/* Export / Download */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleExport}
                  className="flex-row items-center py-3.5 px-2 rounded-xl active:bg-black/[0.05]"
                >
                  <Ionicons name="download-outline" size={22} color="#1C1C1E" style={{ marginRight: 16 }} />
                  <Text allowFontScaling={false} className="text-[15.5px] font-outfit-medium text-[#1C1C1E]">
                    Download media
                  </Text>
                </TouchableOpacity>

                {/* Media Details */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleInfo}
                  className="flex-row items-center py-3.5 px-2 rounded-xl active:bg-black/[0.05]"
                >
                  <Ionicons name="information-circle-outline" size={22} color="#1C1C1E" style={{ marginRight: 16 }} />
                  <Text allowFontScaling={false} className="text-[15.5px] font-outfit-medium text-[#1C1C1E]">
                    Media details
                  </Text>
                </TouchableOpacity>

                {/* Author Info */}
                <View className="flex-row items-center py-3.5 px-2 rounded-xl">
                  <Ionicons name="person-outline" size={22} color="#70757A" style={{ marginRight: 16 }} />
                  <Text allowFontScaling={false} className="text-[15.5px] font-outfit-medium text-[#70757A]">
                    {activePin.author ? `Created by ${activePin.author}` : "Created by You"}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* Confirmation iOS Modal for Remove Pin */}
      <IosDialog
        visible={showRemoveConfirm}
        title="Remove Pin"
        message="Are you sure you want to remove this pin from your gallery?"
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: handleCancelRemove,
          },
          {
            text: "Remove",
            style: "destructive",
            bold: true,
            onPress: handleConfirmRemove,
          },
        ]}
        onClose={handleCancelRemove}
      />

      {/* Download / Export Media Success iOS Dialog */}
      <IosDialog
        visible={showExportSuccess}
        title="Saved to Device"
        message="The media file has been successfully downloaded to your device library."
        actions={[
          {
            text: "OK",
            bold: true,
            style: "default",
            onPress: () => {
              setShowExportSuccess(false);
              onClose();
            },
          },
        ]}
        onClose={() => {
          setShowExportSuccess(false);
          onClose();
        }}
      />
    </>
  );
}

export const ApplePhotoOptionsSheet = GalleryPinOptionsSheet;









