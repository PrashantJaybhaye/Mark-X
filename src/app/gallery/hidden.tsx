import React, { useState, useEffect, useRef, useCallback } from "react";
import {
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import {
  GalleryPin,
  formatBytes,
  createLocalThumbnail,
} from "../../utils/galleryData";
import { auth } from "../../services/firebase";
import { safePickMultipleImages } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";
import { uploadFileToMarkx } from "../../services/cloudflareStorage";
import {
  loadCachedHiddenGalleryPins,
  saveCachedHiddenGalleryPins,
  loadCachedGalleryPins,
} from "../../services/storageService";
import {
  fetchHiddenGalleryPinsPage,
  HIDDEN_GALLERY_PAGE_LIMIT,
  addHiddenGalleryPinToServer,
  deleteHiddenGalleryPinFromServer,
  subscribeHiddenGalleryPins,
  movePinToMainGallery,
  movePinToHiddenGallery,
} from "../../services/hiddenGalleryFirebaseService";
import { fetchGalleryPinsPage } from "../../services/galleryFirebaseService";
import { executeUploadWithRetry } from "../../services/BackgroundUploadService";
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
  const [unhideSuccessDialog, setUnhideSuccessDialog] = useState(false);

  // Options Modal
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [mainGalleryPins, setMainGalleryPins] = useState<GalleryPin[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);

  const numColumns = 3;
  const gridGap = 4;
  const totalGaps = gridGap * (numColumns - 1);
  const itemWidth = (windowWidth - 24 - totalGaps) / numColumns;

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
          const filtered = serverPins.filter((p) => !uploadingIds.has(p.id));
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

  // Add photos directly to My Eyes Only
  const handleAddPhotos = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const results = await safePickMultipleImages(5);
    if (!results || results.length === 0) return;

    const newPins: GalleryPin[] = await Promise.all(
      results.map(async (result, idx) => {
        const ratio =
          result.width && result.height
            ? Math.max(Math.min(result.width / result.height, 1.4), 0.6)
            : 0.75;
        const isVideo = result.type === "video";
        const timestamp = Date.now() + idx;
        const fileName = `${timestamp}${isVideo ? ".mp4" : ".jpg"}`;
        const fileSize = result.fileSize || (isVideo ? 14800000 : 2800000);
        const thumbnailUrl = await createLocalThumbnail(result.uri, 350);

        return {
          id: `myeyes-pin-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
          fileName,
          author: auth.currentUser?.displayName || "You",
          imageUrl: result.uri,
          localUri: result.uri,
          thumbnailUrl,
          mediaType: isVideo ? "video" : "image",
          ...(isVideo && typeof result.duration === "number" ? { duration: result.duration } : {}),
          aspectRatio: ratio,
          width: result.width || 1080,
          height: result.height || 1440,
          fileSize,
          fileSizeFormatted: formatBytes(fileSize),
          mimeType: result.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
          likes: 0,
          isLiked: false,
          saved: false,
          uploadStatus: "uploading",
        };
      })
    );

    setPins((prev) => {
      const updated = [...newPins, ...prev];
      saveCachedHiddenGalleryPins(updated);
      return updated;
    });

    newPins.forEach(async (pin) => {
      await addHiddenGalleryPinToServer(pin);
      try {
        const isVideo = pin.mediaType === "video";
        const mime = pin.mimeType || (isVideo ? "video/mp4" : "image/jpeg");
        const safeFileName = pin.fileName || `${pin.id}.${isVideo ? "mp4" : "jpg"}`;
        const res = await executeUploadWithRetry(
          { id: pin.id, localUri: pin.imageUrl, mimeType: mime, fileName: safeFileName, maxRetries: 3 },
          (uri, mType, fName, onProg) => uploadFileToMarkx(uri, mType, fName, onProg)
        );
        if (res.success && res.url) {
          setPins((curr) => {
            const updated = curr.map((p) => (p.id === pin.id ? { ...p, imageUrl: res.url!, uploadStatus: "synced" as const } : p));
            saveCachedHiddenGalleryPins(updated);
            return updated;
          });
        }
      } catch (e) {
        console.warn("[MyEyesOnly] Upload failed:", e);
      }
    });
  };

  // Import Modal handling
  const handleOpenImportModal = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setShowImportModal(true);
    try {
      const mainCached = await loadCachedGalleryPins();
      if (mainCached && mainCached.length > 0) {
        setMainGalleryPins(mainCached);
      }
      const res = await fetchGalleryPinsPage(null, 50);
      if (res && res.pins && res.pins.length > 0) {
        setMainGalleryPins(res.pins);
      }
    } catch (err) {
      console.warn("[Hidden] Error loading main pins for import:", err);
    }
  };

  const handleImportSinglePin = async (pinId: string) => {
    setImportingId(pinId);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const success = await movePinToHiddenGallery(pinId);
    if (success) {
      setMainGalleryPins((prev) => prev.filter((p) => p.id !== pinId));
      loadCachedHiddenGalleryPins().then(setPins);
    }
    setImportingId(null);
  };

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

    for (const id of targets) {
      await movePinToMainGallery(id);
    }
    setUnhideSuccessDialog(true);
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

    for (const id of targets) {
      await deleteHiddenGalleryPinFromServer(id);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }} className="flex-row items-center justify-between">
        {/* Left: Back Chevron */}
        <TouchableOpacity
          onPress={() => {
            if (isSelectMode) {
              setIsSelectMode(false);
              setSelectedIds(new Set());
            } else {
              router.back();
            }
          }}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          activeOpacity={0.6}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={26} color="#000000" />
        </TouchableOpacity>

        {/* Center: Title & Count */}
        <View className="items-center">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="lock-closed" size={13} color="#111111" />
            <Text style={{ fontSize: 16, fontFamily: "Outfit_700Bold", color: "#111111" }}>
              My Eyes Only
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: "Outfit_500Medium", color: "#8E8E93" }}>
            {pins.length} {pins.length === 1 ? "Snap" : "Snaps"}
          </Text>
        </View>

        {/* Right: Select toggle and Add button */}
        <View className="flex-row items-center gap-3">
          {pins.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setIsSelectMode(!isSelectMode);
                setSelectedIds(new Set());
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.6}
            >
              <Text style={{ fontSize: 14.5, fontFamily: "Outfit_600SemiBold", color: isSelectMode ? "#EF4444" : "#EB5B49" }}>
                {isSelectMode ? "Cancel" : "Select"}
              </Text>
            </TouchableOpacity>
          )}

          {!isSelectMode && (
            <>
              <TouchableOpacity
                onPress={handleAddPhotos}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.6}
              >
                <Ionicons name="add" size={24} color="#111111" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setShowOptionsModal(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.6}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#111111" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#EB5B49" />
        </View>
      ) : pins.length === 0 ? (
        /* Authentic Snapchat-style Empty State */
        <View className="flex-1 items-center justify-center px-8">
          {/* Stylized Padlock Badge */}
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "#FFFFFF",
              borderWidth: 2,
              borderColor: "#111111",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 3,
            }}
            className="items-center justify-center mb-5 relative"
          >
            <View
              style={{
                position: "absolute",
                top: 6,
                right: 8,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: "#EB5B49",
                borderWidth: 1.5,
                borderColor: "#111111",
              }}
            />
            <Ionicons name="lock-closed" size={38} color="#111111" />
          </View>

          <Text style={{ fontSize: 22, fontFamily: "Outfit_700Bold", color: "#111111", letterSpacing: -0.3 }} className="text-center mb-2">
            Nothing in My Eyes Only
          </Text>

          <Text style={{ fontSize: 14.5, fontFamily: "Outfit_400Regular", color: "#71767B", lineHeight: 21 }} className="text-center max-w-[280px] mb-8">
            Move photos and videos here so only you can see them.
          </Text>

          {/* Action Buttons with Brand Orange Theme */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAddPhotos}
            style={{
              height: 48,
              borderRadius: 24,
              backgroundColor: "#EB5B49",
              paddingHorizontal: 28,
            }}
            className="flex-row items-center justify-center gap-2 shadow-xs"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#FFFFFF" }}>
              Add Photos & Videos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenImportModal}
            style={{
              height: 44,
              borderRadius: 22,
              backgroundColor: "#F5F6F8",
              borderWidth: 1,
              borderColor: "#E9EBEF",
              paddingHorizontal: 22,
            }}
            className="mt-3.5 flex-row items-center justify-center gap-2"
          >
            <Ionicons name="albums-outline" size={17} color="#111111" />
            <Text style={{ fontSize: 14, fontFamily: "Outfit_500Medium", color: "#111111" }}>
              Import from Gallery
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Media Grid */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: isSelectMode ? 90 : 30,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: gridGap,
          }}
        >
          {pins.map((pin) => {
            const isSelected = selectedIds.has(pin.id);
            return (
              <TouchableOpacity
                key={pin.id}
                activeOpacity={0.8}
                onPress={() => {
                  if (isSelectMode) {
                    toggleSelectPin(pin.id);
                  } else {
                    router.push({
                      pathname: "/gallery/[id]",
                      params: { id: pin.id, initialPin: JSON.stringify(pin) },
                    });
                  }
                }}
                onLongPress={() => {
                  if (!isSelectMode) {
                    setIsSelectMode(true);
                    setSelectedIds(new Set([pin.id]));
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                  }
                }}
                style={{
                  width: itemWidth,
                  height: itemWidth * 1.25,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: "#F5F6F8",
                }}
                className="relative"
              >
                <Image
                  source={{ uri: pin.thumbnailUrl || pin.imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />

                {/* Video Play Badge */}
                {pin.mediaType === "video" && (
                  <View className="absolute bottom-1.5 left-1.5 bg-black/60 rounded px-1.5 py-0.5 flex-row items-center gap-1">
                    <Ionicons name="play" size={10} color="#FFFFFF" />
                    {pin.duration ? (
                      <Text style={{ fontSize: 9.5, color: "#FFFFFF", fontFamily: "Outfit_500Medium" }}>
                        {Math.round(pin.duration)}s
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Multi-Select Circle */}
                {isSelectMode && (
                  <View
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: isSelected ? "#EB5B49" : "rgba(0,0,0,0.3)",
                      borderWidth: 1.5,
                      borderColor: "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Multi-Select Bottom Action Bar */}
      {isSelectMode && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            paddingHorizontal: 20,
            paddingVertical: 12,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 10,
          }}
          className="flex-row items-center justify-between"
        >
          <Text style={{ fontSize: 13.5, fontFamily: "Outfit_600SemiBold", color: "#111111" }}>
            {selectedIds.size} Selected
          </Text>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setShowUnhideConfirm(true)}
              disabled={selectedIds.size === 0}
              style={{
                height: 38,
                borderRadius: 19,
                backgroundColor: "#F5F6F8",
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: "#E9EBEF",
                opacity: selectedIds.size > 0 ? 1 : 0.4,
              }}
              className="flex-row items-center gap-1.5"
            >
              <Ionicons name="eye-outline" size={16} color="#111111" />
              <Text style={{ fontSize: 13, fontFamily: "Outfit_500Medium", color: "#111111" }}>
                Move to Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0}
              style={{
                height: 38,
                borderRadius: 19,
                backgroundColor: "#FEE2E2",
                paddingHorizontal: 16,
                opacity: selectedIds.size > 0 ? 1 : 0.4,
              }}
              className="flex-row items-center gap-1.5"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#EF4444" }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Import from Gallery Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImportModal(false)}
      >
        <View className="flex-1 bg-black/45 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowImportModal(false)}
            className="flex-1"
          />
          <View
            style={{
              maxHeight: "82%",
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: 24,
            }}
            className="w-full shadow-2xl"
          >
            {/* Sheet Handle */}
            <View className="w-10 h-1.5 rounded-full bg-[#D1D1D6] self-center mt-3 mb-2" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-2.5 border-b border-[#F2F2F7]">
              <TouchableOpacity
                onPress={() => setShowImportModal(false)}
                activeOpacity={0.6}
                className="py-1"
              >
                <Text style={{ fontSize: 16, fontFamily: "Outfit_500Medium", color: "#8E8E93" }}>Cancel</Text>
              </TouchableOpacity>

              <View className="items-center">
                <Text style={{ fontSize: 16, fontFamily: "Outfit_700Bold", color: "#111111" }}>
                  Move to My Eyes Only
                </Text>
                <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: "#8E8E93" }}>
                  {mainGalleryPins.length} photos available
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowImportModal(false)}
                activeOpacity={0.6}
                className="py-1"
              >
                <Text style={{ fontSize: 16, fontFamily: "Outfit_600SemiBold", color: "#EB5B49" }}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Photo List */}
            {mainGalleryPins.length === 0 ? (
              <View className="py-16 items-center px-8">
                <Ionicons name="images-outline" size={32} color="#8E8E93" />
                <Text style={{ fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#111111", marginTop: 8 }}>
                  No Photos to Import
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Outfit_400Regular", color: "#8E8E93", textAlign: "center", marginTop: 4 }}>
                  All photos in your gallery are already moved to My Eyes Only.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  padding: 8,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {mainGalleryPins.map((item) => {
                  const mItemWidth = (windowWidth - 16 - 12) / 3;
                  const isThisImporting = importingId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => handleImportSinglePin(item.id)}
                      disabled={isThisImporting}
                      style={{
                        width: mItemWidth,
                        height: mItemWidth,
                        borderRadius: 12,
                        overflow: "hidden",
                        backgroundColor: "#F5F6F8",
                      }}
                      className="relative"
                    >
                      <Image
                        source={{ uri: item.thumbnailUrl || item.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />

                      {/* Video badge */}
                      {item.mediaType === "video" && (
                        <View className="absolute bottom-1.5 left-1.5 bg-black/60 rounded px-1.5 py-0.5">
                          <Ionicons name="play" size={10} color="#FFFFFF" />
                        </View>
                      )}

                      {/* Add overlay */}
                      <View className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 items-center justify-center shadow-xs">
                        {isThisImporting ? (
                          <ActivityIndicator size="small" color="#EB5B49" style={{ transform: [{ scale: 0.6 }] }} />
                        ) : (
                          <Ionicons name="add" size={16} color="#EB5B49" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
            text: "Move to Gallery",
            style: "default",
            bold: true,
            onPress: handleConfirmUnhide,
          },
        ]}
      />

      {/* Unhide Success Dialog */}
      <IosDialog
        visible={unhideSuccessDialog}
        onClose={() => setUnhideSuccessDialog(false)}
        title="Moved to Gallery"
        message="The items have been moved back to your main gallery."
        actions={[
          {
            text: "OK",
            style: "default",
            bold: true,
            onPress: () => setUnhideSuccessDialog(false),
          },
        ]}
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
                setShowOptionsModal(false);
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                router.replace("/(main)/gallery");
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
