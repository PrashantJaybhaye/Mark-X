import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DriveItem, splitFileName, getKindLabel } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";
import { FileCategoryIcon } from "./FileCategoryIcon";
import { IosDialog } from "../common/IosDialog";
import { openInNativeApp } from "../../services/nativeFileOpenerService";
import { exportDriveFile, formatDriveTimestamp } from "../../services/driveFirebaseService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface DriveFileOptionsSheetProps {
  visible: boolean;
  item: DriveItem | null;
  allItems?: DriveItem[];
  parentFolderName?: string;
  theme?: "sand" | "dark";
  onClose: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onShare?: (item: DriveItem) => void;
  onExport?: (item: DriveItem) => void;
  onOpenInNativeApp?: (item: DriveItem) => void;
  onToggleStar?: (item: DriveItem) => void;
}

export function DriveFileOptionsSheet({
  visible,
  item,
  allItems,
  parentFolderName,
  theme = "sand",
  onClose,
  onDelete,
  onRename,
  onShare,
  onExport,
  onOpenInNativeApp,
  onToggleStar,
}: DriveFileOptionsSheetProps) {
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");
  const [fileExtension, setFileExtension] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const lastItemRef = useRef<DriveItem | null>(item);
  useEffect(() => {
    if (item) lastItemRef.current = item;
  }, [item]);
  const currentItem = item || lastItemRef.current;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setIsRenaming(false);
      setShowInfoModal(false);
      setShowDeleteConfirm(false);
      setKeyboardHeight(0);
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
      Keyboard.dismiss();
      backdropOpacity.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
      setShowDeleteConfirm(false);
      setIsRenaming(false);
      setShowInfoModal(false);
    }
  }, [visible]);

  const animateCloseOnly = (callback?: () => void) => {
    Keyboard.dismiss();
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

  if (!currentItem) return null;

  const handleOpenNative = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    animateClose(() => {
      if (onOpenInNativeApp) {
        onOpenInNativeApp(currentItem);
      } else {
        openInNativeApp(currentItem);
      }
    });
  };

  const handleExportOrShare = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    animateClose(() => {
      if (onExport) {
        onExport(currentItem);
      } else if (onShare) {
        onShare(currentItem);
      } else {
        exportDriveFile(currentItem);
      }
    });
  };

  const handleToggleStar = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onToggleStar?.(currentItem);
  };

  const handleStartRename = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const { base, ext } = splitFileName(currentItem.name, currentItem.isFolder);
    setNewBaseName(base);
    setFileExtension(ext);
    setIsRenaming(true);
  };

  const handleSaveRename = () => {
    Keyboard.dismiss();
    let cleanBase = newBaseName.trim();
    if (fileExtension && cleanBase.toLowerCase().endsWith(fileExtension.toLowerCase())) {
      cleanBase = cleanBase.slice(0, -fileExtension.length).trim();
    }
    const finalName = cleanBase ? `${cleanBase}${fileExtension}` : currentItem.name;
    if (finalName && finalName !== currentItem.name) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      onRename?.(currentItem.id, finalName);
    }
    animateClose();
  };

  const handleDeletePress = () => {
    Keyboard.dismiss();
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    animateCloseOnly(() => {
      setShowDeleteConfirm(true);
    });
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    if (currentItem) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      onDelete?.(currentItem.id);
    }
    onClose();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleOpenDetails = () => {
    Keyboard.dismiss();
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    animateCloseOnly(() => {
      setShowInfoModal(true);
    });
  };

  const handleCloseDetails = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setShowInfoModal(false);
    onClose();
  };

  const sheetBgClass = isDark
    ? "bg-[#161719] border-white/[0.08]"
    : "bg-[#F5F4F0] border-black/[0.05]";
  const cardBgClass = isDark
    ? "bg-[#222428] border-white/[0.08]"
    : "bg-[#E7E4DC] border-black/[0.04]";
  const cardActiveBgClass = isDark ? "active:bg-[#2C2E33]" : "active:bg-[#DCD8CD]";
  const textPrimaryClass = isDark ? "text-white" : "text-[#1C1C1E]";
  const textSecondaryClass = isDark ? "text-[#9BA1A6]" : "text-[#70757A]";
  const iconDefaultColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const iconSubtleColor = isDark ? "#63666A" : "#A0A5AA";
  const dividerClass = isDark ? "border-white/[0.06]" : "border-black/[0.05]";
  const handleColor = isDark ? "bg-white/20" : "bg-black/15";
  const iconBoxBgClass = isDark ? "bg-white/[0.06]" : "bg-black/[0.05]";

  const bottomPadding =
    isRenaming && keyboardHeight > 0
      ? keyboardHeight + (Platform.OS === "android" ? 14 : 10)
      : Math.max(insets.bottom, 24) + 16;

  return (
    <>
      <Modal
        visible={visible && !showDeleteConfirm && !showInfoModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => animateClose()}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
        >
          {}
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              animateClose();
            }}
          >
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isDark ? "rgba(0, 0, 0, 0.70)" : "rgba(0, 0, 0, 0.45)",
                opacity: backdropOpacity,
              }}
            />
          </TouchableWithoutFeedback>

          {}
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <Animated.View
              className={`${sheetBgClass} rounded-t-[32px] px-5 pt-3 shadow-2xl relative border-t`}
              style={{
                transform: [{ translateY: slideAnim }],
                paddingBottom: bottomPadding,
              }}
            >
              {}
              <View className="items-center mb-3">
                <View className={`w-10 h-1 rounded-full ${handleColor}`} />
              </View>

              {}
              <View className={`flex-row items-center p-4 rounded-[24px] ${cardBgClass} border mb-3.5`}>
                <View className={`w-12 h-12 rounded-2xl ${iconBoxBgClass} items-center justify-center mr-3.5`}>
                  <FileCategoryIcon
                    category={currentItem.isFolder ? "folder" : currentItem.category}
                    size={32}
                    uri={currentItem.uri}
                    id={currentItem.id}
                    fileName={currentItem.name}
                  />
                </View>
                <View className="flex-1 pr-2">
                  <Text className={`text-[16px] font-outfit-bold ${textPrimaryClass}`} numberOfLines={1}>
                    {currentItem.name}
                  </Text>
                  <Text className={`text-[12.5px] font-outfit-medium ${textSecondaryClass} mt-0.5`} numberOfLines={1}>
                    {`You opened • ${formatDriveTimestamp(currentItem.updatedAt)}`}
                  </Text>
                </View>
              </View>

              {isRenaming ? (
                <View className={`p-4 rounded-[24px] ${cardBgClass} border mb-2`}>
                  <Text className={`text-[13.5px] font-outfit-semibold ${textPrimaryClass} mb-2.5`}>
                    Rename {currentItem.isFolder ? "folder" : "document"}
                  </Text>

                  {}
                  <View
                    className={`flex-row items-center rounded-2xl px-4 h-12 mb-3 border ${
                      isDark
                        ? "bg-[#141517] border-white/10"
                        : "bg-white/90 border-black/10"
                    }`}
                  >
                    <TextInput
                      value={newBaseName}
                      onChangeText={setNewBaseName}
                      autoFocus
                      selectTextOnFocus
                      placeholder={currentItem.isFolder ? "Folder name" : "Document name"}
                      placeholderTextColor={isDark ? "#5C5E64" : "#A0A5AA"}
                      className={`flex-1 text-[14.5px] font-outfit h-full pr-2 ${textPrimaryClass}`}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveRename}
                    />
                    {fileExtension ? (
                      <View
                        className={`px-2.5 py-1 rounded-lg border ${
                          isDark ? "bg-white/10 border-white/10" : "bg-black/5 border-black/5"
                        }`}
                      >
                        <Text
                          className={`text-[12px] font-outfit-bold ${
                            isDark ? "text-white/70" : "text-[#70757A]"
                          }`}
                        >
                          {fileExtension}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="flex-row justify-end space-x-2">
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setIsRenaming(false);
                      }}
                      className="px-4 py-2.5 rounded-xl active:opacity-60"
                    >
                      <Text className={`text-[14px] font-outfit-medium ${textSecondaryClass}`}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveRename}
                      className={`px-5 py-2.5 rounded-xl ${
                        isDark ? "bg-white active:bg-white/90" : "bg-[#1C1C1E] active:bg-black/80"
                      }`}
                    >
                      <Text
                        className={`text-[14px] font-outfit-bold ${
                          isDark ? "text-[#121214]" : "text-white"
                        }`}
                      >
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {}
                  <View className="flex-row gap-2.5 mb-3.5">
                    {}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={handleToggleStar}
                      className={`flex-1 ${cardBgClass} ${cardActiveBgClass} py-3 px-1 rounded-[20px] items-center justify-center border`}
                    >
                      <Ionicons
                        name={currentItem.starred ? "star" : "star-outline"}
                        size={21}
                        color={currentItem.starred ? "#FFB800" : iconDefaultColor}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        allowFontScaling={false}
                        className={`text-[12px] font-outfit-semibold ${textPrimaryClass}`}
                        numberOfLines={1}
                      >
                        {currentItem.starred ? "Starred" : "Star"}
                      </Text>
                    </TouchableOpacity>

                    {}
                    {!currentItem.isFolder && (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={handleOpenNative}
                        className={`flex-1 ${cardBgClass} ${cardActiveBgClass} py-3 px-1 rounded-[20px] items-center justify-center border`}
                      >
                        <Ionicons
                          name="open-outline"
                          size={21}
                          color={iconDefaultColor}
                          style={{ marginBottom: 4 }}
                        />
                        <Text
                          allowFontScaling={false}
                          className={`text-[12px] font-outfit-semibold ${textPrimaryClass}`}
                          numberOfLines={1}
                        >
                          Open In
                        </Text>
                      </TouchableOpacity>
                    )}

                    {}
                    {!currentItem.isFolder && (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={handleExportOrShare}
                        className={`flex-1 ${cardBgClass} ${cardActiveBgClass} py-3 px-1 rounded-[20px] items-center justify-center border`}
                      >
                        <Ionicons
                          name="download-outline"
                          size={21}
                          color={iconDefaultColor}
                          style={{ marginBottom: 4 }}
                        />
                        <Text
                          allowFontScaling={false}
                          className={`text-[12px] font-outfit-semibold ${textPrimaryClass}`}
                          numberOfLines={1}
                        >
                          Export
                        </Text>
                      </TouchableOpacity>
                    )}

                    {}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={handleOpenDetails}
                      className={`flex-1 ${cardBgClass} ${cardActiveBgClass} py-3 px-1 rounded-[20px] items-center justify-center border`}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={21}
                        color={iconDefaultColor}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        allowFontScaling={false}
                        className={`text-[12px] font-outfit-semibold ${textPrimaryClass}`}
                        numberOfLines={1}
                      >
                        Details
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {}
                  <View className={`rounded-[24px] ${cardBgClass} border overflow-hidden`}>
                    {}
                    <TouchableOpacity
                      activeOpacity={0.65}
                      onPress={handleStartRename}
                      className={`flex-row items-center px-4 py-3.5 border-b ${dividerClass} ${cardActiveBgClass}`}
                    >
                      <View className={`w-9 h-9 rounded-xl ${iconBoxBgClass} items-center justify-center mr-3.5`}>
                        <Ionicons name="create-sharp" size={19} color={iconDefaultColor} />
                      </View>
                      <Text className={`text-[14.5px] font-outfit-semibold ${textPrimaryClass} flex-1`}>
                        Rename {currentItem.isFolder ? "Folder" : "Document"}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={iconSubtleColor} />
                    </TouchableOpacity>

                    {}
                    <TouchableOpacity
                      activeOpacity={0.65}
                      onPress={handleDeletePress}
                      className={`flex-row items-center px-4 py-3.5 ${cardActiveBgClass}`}
                    >
                      <View className="w-9 h-9 rounded-xl bg-red-500/15 items-center justify-center mr-3.5">
                        <Ionicons name="trash-bin-outline" size={19} color="#FF453A" />
                      </View>
                      <Text className="text-[14.5px] font-outfit-semibold text-[#FF453A] flex-1">
                        Delete {currentItem.isFolder ? "Folder" : "Document"}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#FF453A" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {}
      <Modal
        visible={showInfoModal && !!currentItem}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseDetails}
      >
        <TouchableWithoutFeedback onPress={handleCloseDetails}>
          <View className="flex-1 bg-black/75 items-center justify-center px-5">
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View className="w-full max-w-[350px] bg-[#16171B] rounded-[30px] p-5 border border-white/[0.1] shadow-2xl">
                {}
                <View className="flex-row items-center justify-between pb-3 border-b border-white/[0.06]">
                  <Text className="text-[13px] font-outfit-bold text-[#8E8E93] tracking-widest uppercase">
                    {currentItem.isFolder ? "Folder Info" : "File Info"}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCloseDetails}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    className="w-7 h-7 rounded-full bg-white/[0.08] items-center justify-center active:bg-white/20"
                  >
                    <Ionicons name="close" size={15} color="#C7C7CC" />
                  </TouchableOpacity>
                </View>

                {}
                <View className="items-center my-3.5">
                  <View className="w-16 h-16 rounded-[22px] bg-[#202127] border border-white/[0.08] items-center justify-center shadow-md mb-2.5">
                    <FileCategoryIcon
                      category={currentItem.isFolder ? "folder" : currentItem.category}
                      size={38}
                      uri={currentItem.uri}
                      id={currentItem.id}
                      fileName={currentItem.name}
                    />
                  </View>
                  <Text
                    className="text-[16.5px] font-outfit-bold text-white text-center leading-snug px-2"
                    numberOfLines={2}
                  >
                    {currentItem.name}
                  </Text>
                  <Text className="text-[12.5px] font-outfit text-[#8E8E93] text-center mt-1">
                    {currentItem.size ? `${currentItem.size} • ` : ""}{getKindLabel(currentItem)}
                  </Text>
                </View>

                {}
                {(() => {
                  const locationName = currentItem.parentId
                    ? parentFolderName ||
                      allItems?.find((f) => f.id === currentItem.parentId)?.name ||
                      "Folder"
                    : "My Drive";
                  const ownerName = currentItem.sharedBy || "You (Owner)";

                  return (
                    <View className="bg-[#1F2026] rounded-[20px] border border-white/[0.06] px-4 py-1">
                      {}
                      <View className="flex-row items-center justify-between py-2.5 border-b border-white/[0.05]">
                        <Text className="text-[13px] font-outfit text-[#8E8E93]">Kind</Text>
                        <Text className="text-[13px] font-outfit-medium text-white max-w-[170px]" numberOfLines={1}>
                          {getKindLabel(currentItem)}
                        </Text>
                      </View>

                      {}
                      {currentItem.size && (
                        <View className="flex-row items-center justify-between py-2.5 border-b border-white/[0.05]">
                          <Text className="text-[13px] font-outfit text-[#8E8E93]">Size</Text>
                          <Text className="text-[13px] font-outfit-medium text-white">
                            {currentItem.size}
                          </Text>
                        </View>
                      )}

                      {}
                      <View className="flex-row items-center justify-between py-2.5 border-b border-white/[0.05]">
                        <Text className="text-[13px] font-outfit text-[#8E8E93]">Where</Text>
                        <Text className="text-[13px] font-outfit-medium text-white max-w-[170px]" numberOfLines={1}>
                          {locationName}
                        </Text>
                      </View>

                      {}
                      <View className="flex-row items-center justify-between py-2.5">
                        <Text className="text-[13px] font-outfit text-[#8E8E93]">Owner</Text>
                        <Text className="text-[13px] font-outfit-medium text-white max-w-[170px]" numberOfLines={1}>
                          {ownerName}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                {}
                <TouchableOpacity
                  onPress={handleCloseDetails}
                  activeOpacity={0.85}
                  className="bg-white h-11 rounded-2xl items-center justify-center active:bg-white/90 shadow-md mt-5"
                >
                  <Text className="text-[14.5px] font-outfit-bold text-[#111215]">Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {}
      <IosDialog
        visible={showDeleteConfirm && !!currentItem}
        title={currentItem.isFolder ? "Delete Folder" : "Delete Document"}
        message={`Are you sure you want to delete "${currentItem.name}"? This action cannot be undone.`}
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: handleCancelDelete,
          },
          {
            text: "Delete",
            style: "destructive",
            bold: true,
            onPress: handleConfirmDelete,
          },
        ]}
        onClose={handleCancelDelete}
      />
    </>
  );
}
