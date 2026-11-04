import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AppState,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Modal,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { GalleryPin } from "../../utils/galleryData";
import { triggerHaptic } from "../../utils/haptics";
import {
  loadCachedHiddenGalleryPins,
  saveCachedHiddenGalleryPins,
  setMemoryHiddenGalleryPins,
} from "../../services/storageService";
import { GalleryPinCard } from "../../components/gallery/GalleryPinCard";
import { GalleryPinOptionsSheet } from "../../components/gallery/GalleryPinOptionsSheet";
import { GalleryPinInfoSheet } from "../../components/gallery/GalleryPinInfoSheet";
import { GalleryMasonrySkeleton } from "../../components/gallery/GallerySkeleton";
import { GalleryEmptyState } from "../../components/gallery/GalleryEmptyState";
import {
  fetchHiddenGalleryPinsPage,
  HIDDEN_GALLERY_PAGE_LIMIT,
  deleteHiddenGalleryPinFromServer,
  subscribeHiddenGalleryPins,
  movePinToMainGallery,
  moveMultiplePinsToMainGallery,
  deleteMultipleHiddenGalleryPins,
} from "../../services/hiddenGalleryFirebaseService";
import { IosDialog } from "../../components/common/IosDialog";

export default function MyEyesOnlyVaultScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const [pins, setPins] = useState<GalleryPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnhideConfirm, setShowUnhideConfirm] = useState(false);
  const pendingOperationIdsRef = useRef<Set<string>>(new Set());

  // Options Modal
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const gutter = 6;
  const sideMargin = 8;
  const columnWidth = (windowWidth - sideMargin * 2 - gutter) / 2;

  const [optionsPin, setOptionsPin] = useState<GalleryPin | null>(null);
  const [infoPin, setInfoPin] = useState<GalleryPin | null>(null);
  const sortedPinsRef = useRef<GalleryPin[]>([]);
  const isNavigatingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false;
    }, [])
  );

  const { leftPins, rightPins } = useMemo(() => {
    const left: GalleryPin[] = [];
    const right: GalleryPin[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    const savedBucket: GalleryPin[] = [];
    const unsavedBucket: GalleryPin[] = [];

    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i];
      if (pin.saved) savedBucket.push(pin);
      else unsavedBucket.push(pin);
    }

    const sortedPins = savedBucket.concat(unsavedBucket);
    sortedPinsRef.current = sortedPins;

    sortedPins.forEach((pin) => {
      const estimatedHeight = Math.min(Math.max(columnWidth / pin.aspectRatio, 120), 320) + 16;
      if (leftHeight <= rightHeight) {
        left.push(pin);
        leftHeight += estimatedHeight;
      } else {
        right.push(pin);
        rightHeight += estimatedHeight;
      }
    });

    return { leftPins: left, rightPins: right };
  }, [pins, columnWidth]);

  const handleSelectPin = useCallback((pin: GalleryPin) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);

    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const sortedList =
      sortedPinsRef.current && sortedPinsRef.current.length > 0
        ? sortedPinsRef.current
        : pins.filter((p) => !!p.hidden);
    const pinIdx = sortedList ? sortedList.findIndex((p) => p.id === pin.id) : -1;

    if (sortedList && sortedList.length > 0) {
      setMemoryHiddenGalleryPins(sortedList);
    }

    router.push({
      pathname: "/gallery/[id]",
      params: {
        id: pin.id,
        initialPin: JSON.stringify(pin),
        initialIndex: pinIdx >= 0 ? String(pinIdx) : "0",
        source: "hidden",
      },
    });
  }, [pins, router]);

  const handleSaveToggle = async (pinId: string) => {
    setPins((prev) => {
      const updated = prev.map((p) => (p.id === pinId ? { ...p, saved: !p.saved } : p));
      saveCachedHiddenGalleryPins(updated);
      return updated;
    });
  };

  const handleDeleteSinglePin = async (pinId: string) => {
    setPins((prev) => {
      const updated = prev.filter((p) => p.id !== pinId);
      saveCachedHiddenGalleryPins(updated);
      return updated;
    });
    pendingOperationIdsRef.current.add(pinId);
    try {
      await deleteHiddenGalleryPinFromServer(pinId);
    } finally {
      pendingOperationIdsRef.current.delete(pinId);
    }
  };

  // Auto-lock vault on app minimize / background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(main)/gallery");
        }
      }
    });
    return () => sub.remove();
  }, [router]);

  // Handle Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (showOptionsModal) {
        setShowOptionsModal(false);
        return true;
      }
      if (showUnhideConfirm) {
        setShowUnhideConfirm(false);
        return true;
      }
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        return true;
      }
      if (isSelectMode) {
        setIsSelectMode(false);
        setSelectedIds(new Set());
        return true;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(main)/gallery");
      }
      return true;
    };

    const backSub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backSub.remove();
  }, [showOptionsModal, showUnhideConfirm, showDeleteConfirm, isSelectMode, router]);

  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setBarStyle("dark-content");
    }
  }, []);

  // Initial load & real-time sync
  useEffect(() => {
    let isMounted = true;

    loadCachedHiddenGalleryPins().then((cached) => {
      if (isMounted && cached.length > 0) {
        setPins(cached);
        setIsLoading(false);
      }
    });

    fetchHiddenGalleryPinsPage(null, HIDDEN_GALLERY_PAGE_LIMIT)
      .then((res) => {
        if (!isMounted) return;
        if (res.pins.length > 0) {
          setPins(res.pins);
          saveCachedHiddenGalleryPins(res.pins);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const unsub = subscribeHiddenGalleryPins(
      (serverPins) => {
        if (!isMounted) return;
        setPins((prev) => {
          const uploadingPins = prev.filter((p) => p.uploadStatus === "uploading");
          const uploadingIds = new Set(uploadingPins.map((p) => p.id));
          const filtered = serverPins.filter(
            (p) => !uploadingIds.has(p.id) && !pendingOperationIdsRef.current.has(p.id)
          );
          const merged = [...uploadingPins, ...filtered];
          saveCachedHiddenGalleryPins(merged);
          return merged;
        });
        setIsLoading(false);
      },
      HIDDEN_GALLERY_PAGE_LIMIT
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Toggle selection
  const toggleSelectPin = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  // Unhide selected
  const handleConfirmUnhide = async () => {
    setShowUnhideConfirm(false);
    const targets = Array.from(selectedIds);
    if (targets.length === 0) return;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setPins((prev) => {
      const updated = prev.filter((p) => !selectedIds.has(p.id));
      saveCachedHiddenGalleryPins(updated);
      return updated;
    });

    setIsSelectMode(false);
    setSelectedIds(new Set());

    targets.forEach((id) => pendingOperationIdsRef.current.add(id));
    try {
      await moveMultiplePinsToMainGallery(targets);
    } finally {
      targets.forEach((id) => pendingOperationIdsRef.current.delete(id));
    }
  };

  // Delete selected
  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    const targets = Array.from(selectedIds);
    if (targets.length === 0) return;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setPins((prev) => {
      const updated = prev.filter((p) => !selectedIds.has(p.id));
      saveCachedHiddenGalleryPins(updated);
      return updated;
    });

    setIsSelectMode(false);
    setSelectedIds(new Set());

    targets.forEach((id) => pendingOperationIdsRef.current.add(id));
    try {
      await deleteMultipleHiddenGalleryPins(targets);
    } finally {
      targets.forEach((id) => pendingOperationIdsRef.current.delete(id));
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between px-5 pt-6 pb-3 bg-white border-b border-[#F2F2F2]">
        {/* Left: Apple Photos Chevron + Label */}
        <TouchableOpacity
          onPress={() => {
            if (isSelectMode) {
              setIsSelectMode(false);
              setSelectedIds(new Set());
            } else {
              router.back();
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.65}
          className="flex-row items-center min-w-[70px]"
        >
          <Ionicons name="chevron-back" size={23} color="#111111" />
        </TouchableOpacity>

        {/* Center: Title with Lock Badge */}
        <View className="items-center justify-center flex-1 px-2">
          <View className="flex-row items-center gap-1.5">
              <Ionicons name="lock-closed" size={14} color="#111111" />
            <Text
              numberOfLines={1}
              style={{ fontSize: 17, fontFamily: "Outfit_700Bold", color: "#111111", letterSpacing: -0.3 }}
            >
              {isSelectMode
                ? selectedIds.size > 0
                  ? `${selectedIds.size} Selected`
                  : "Select Items"
                : "Hidden"}
            </Text>
          </View>
        </View>

        {/* Right: Select pill & Circular action buttons */}
        <View className="flex-row items-center justify-end gap-2.5 min-w-[70px]">
          {pins.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setIsSelectMode(!isSelectMode);
                setSelectedIds(new Set());
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.65}
              className="px-3.5 py-1.5 rounded-full bg-[#F0F2F4] border border-[#E5E7EB]"
            >
              <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: isSelectMode ? "#EF4444" : "#111111" }}>
                {isSelectMode ? "Done" : "Select"}
              </Text>
            </TouchableOpacity>
          )}

          {!isSelectMode && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setShowOptionsModal(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.65}
              className="w-9 h-9 rounded-full bg-[#F0F2F4] border border-[#E5E7EB] items-center justify-center"
            >
              <Ionicons name="ellipsis-horizontal" size={17} color="#111111" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area - Identical structure & logic to Gallery Tab */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: sideMargin,
          paddingTop: 8,
          paddingBottom: isSelectMode ? 85 : 20,
        }}
      >
        {isLoading || isRefreshing ? (
          <GalleryMasonrySkeleton cardWidth={columnWidth} />
        ) : pins.length === 0 ? (
          <View className="flex-1 w-full items-center justify-center py-20">
            <GalleryEmptyState
              cardWidth={columnWidth}
              title="Nothing in Hidden"
              description="Hide photos and videos from your gallery to keep them private."
            />
          </View>
        ) : (
          <View className="flex-row w-full" style={{ gap: gutter }}>
            {/* Left Column */}
            <View style={{ width: columnWidth }}>
              {leftPins.map((pin) => {
                const isSelected = selectedIds.has(pin.id);
                return (
                  <View key={pin.id} className="relative">
                    <GalleryPinCard
                      pin={pin}
                      cardWidth={columnWidth}
                      onPress={(p: GalleryPin) => {
                        if (isSelectMode) {
                          toggleSelectPin(p.id);
                        } else {
                          handleSelectPin(p);
                        }
                      }}
                      onOptionsPress={(p: GalleryPin) => {
                        if (!isSelectMode) setOptionsPin(p);
                      }}
                    />
                    {isSelectMode && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => toggleSelectPin(pin.id)}
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: isSelected ? "#007AFF" : "rgba(0,0,0,0.45)",
                          borderWidth: 1.5,
                          borderColor: "#FFFFFF",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 30,
                        }}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Right Column */}
            <View style={{ width: columnWidth }}>
              {rightPins.map((pin) => {
                const isSelected = selectedIds.has(pin.id);
                return (
                  <View key={pin.id} className="relative">
                    <GalleryPinCard
                      pin={pin}
                      cardWidth={columnWidth}
                      onPress={(p: GalleryPin) => {
                        if (isSelectMode) {
                          toggleSelectPin(p.id);
                        } else {
                          handleSelectPin(p);
                        }
                      }}
                      onOptionsPress={(p: GalleryPin) => {
                        if (!isSelectMode) setOptionsPin(p);
                      }}
                    />
                    {isSelectMode && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => toggleSelectPin(pin.id)}
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: isSelected ? "#007AFF" : "rgba(0,0,0,0.45)",
                          borderWidth: 1.5,
                          borderColor: "#FFFFFF",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 30,
                        }}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sleek Floating Capsule (Zero Shadows, Centered Floating Pill) */}
      {isSelectMode && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            bottom: Platform.OS === "ios" ? 32 : 20,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              paddingVertical: 5,
              paddingHorizontal: 6,
            }}
          >
            {/* Move to Gallery Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setShowUnhideConfirm(true);
              }}
              disabled={selectedIds.size === 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 19,
                backgroundColor: selectedIds.size > 0 ? "#111111" : "transparent",
                opacity: selectedIds.size > 0 ? 1 : 0.35,
              }}
            >
              <Ionicons
                name="eye-outline"
                size={17}
                color={selectedIds.size > 0 ? "#FFFFFF" : "#8E8E93"}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Outfit_600SemiBold",
                  color: selectedIds.size > 0 ? "#FFFFFF" : "#8E8E93",
                }}
              >
                {selectedIds.size > 0 ? `Unhide (${selectedIds.size})` : "Unhide"}
              </Text>
            </TouchableOpacity>

            {/* Vertical Divider */}
            <View
              style={{
                width: 1,
                height: 18,
                backgroundColor: "#E5E7EB",
                marginHorizontal: 3,
              }}
            />

            {/* Delete Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setShowDeleteConfirm(true);
              }}
              disabled={selectedIds.size === 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 19,
                backgroundColor: selectedIds.size > 0 ? "#FEE2E2" : "transparent",
                opacity: selectedIds.size > 0 ? 1 : 0.35,
              }}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={selectedIds.size > 0 ? "#EF4444" : "#8E8E93"}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Outfit_600SemiBold",
                  color: selectedIds.size > 0 ? "#EF4444" : "#8E8E93",
                }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Delete Confirmation Dialog */}
      <IosDialog
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? "Snap" : "Snaps"}?`}
        message="This media will be permanently deleted from My Eyes Only."
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setShowDeleteConfirm(false),
          },
          {
            text: "Delete",
            style: "destructive",
            bold: true,
            onPress: handleConfirmDelete,
          },
        ]}
      />

      {/* Unhide Confirmation Dialog */}
      <IosDialog
        visible={showUnhideConfirm}
        onClose={() => setShowUnhideConfirm(false)}
        title={`Move to Gallery?`}
        message={`Move ${selectedIds.size} ${selectedIds.size === 1 ? "item" : "items"} back to your main public gallery?`}
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setShowUnhideConfirm(false),
          },
          {
            text: "Move",
            style: "default",
            bold: false,
            onPress: handleConfirmUnhide,
          },
        ]}
      />


      {/* Individual Pin Options Sheet & Info Sheet (from Gallery tab) */}
      <GalleryPinOptionsSheet
        pin={optionsPin}
        visible={!!optionsPin}
        onClose={() => setOptionsPin(null)}
        onSaveToggle={handleSaveToggle}
        onHidePin={handleDeleteSinglePin}
        onInfo={(p) => setInfoPin(p)}
      />

      <GalleryPinInfoSheet
        pin={infoPin}
        visible={!!infoPin}
        onClose={() => setInfoPin(null)}
      />

      {/* Options Bottom Sheet */}
      <Modal
        visible={showOptionsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: 32,
              paddingHorizontal: 20,
            }}
          >
            <View className="w-10 h-1.5 rounded-full bg-[#E5E7EB] self-center mb-4" />
            <Text style={{ fontSize: 16, fontFamily: "Outfit_700Bold", color: "#111111", textAlign: "center", marginBottom: 16 }}>
              My Eyes Only Options
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (isNavigatingRef.current) return;
                isNavigatingRef.current = true;
                setTimeout(() => {
                  isNavigatingRef.current = false;
                }, 1000);
                setShowOptionsModal(false);
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/gallery/passcode",
                  params: { mode: "change" },
                });
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
                gap: 12,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEECE9", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="key-outline" size={18} color="#EB5B49" />
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#111111" }}>
                  Change Passcode
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: "#8E8E93" }}>
                  Set a new 4-digit passcode for this vault
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (isNavigatingRef.current) return;
                isNavigatingRef.current = true;
                setTimeout(() => {
                  isNavigatingRef.current = false;
                }, 1000);
                setShowOptionsModal(false);
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(main)/gallery");
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                gap: 12,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="lock-closed-outline" size={18} color="#111111" />
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#111111" }}>
                  Lock Vault
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: "#8E8E93" }}>
                  Exit and require passcode to enter again
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowOptionsModal(false)}
              style={{
                marginTop: 12,
                height: 46,
                borderRadius: 23,
                backgroundColor: "#F5F6F8",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14.5, fontFamily: "Outfit_600SemiBold", color: "#111111" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
