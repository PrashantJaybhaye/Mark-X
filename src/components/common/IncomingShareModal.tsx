import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  clearShare,
  getInitialShare,
  SharedDataPayload,
  subscribeToShares,
} from "../../services/receiveSharingService";
import { DriveItem, getFileCategory } from "../../utils/driveFileTypes";
import { loadDriveItems, saveDriveItems } from "../../services/storageService";
import {
  saveDriveItemToServer,
  uploadDriveFileToCloudflare,
} from "../../services/driveFirebaseService";
import { addGalleryPinToServer } from "../../services/galleryFirebaseService";
import { createLocalThumbnail, formatBytes, GalleryPin } from "../../utils/galleryData";
import { uploadFileToMarkx } from "../../services/cloudflareStorage";
import { emitDriveToast } from "../../services/driveToastService";
import { useAuth } from "../../context/AuthContext";
import { triggerHaptic } from "../../utils/haptics";
import { FileCategoryIcon } from "../drive/FileCategoryIcon";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const isMediaFile = (fileName: string, mimeType: string) => {
  const mime = (mimeType || "").toLowerCase();
  const name = (fileName || "").toLowerCase();
  return (
    mime.includes("image") ||
    mime.includes("video") ||
    /\.(jpg|jpeg|png|gif|webp|heic|mp4|mov|mkv|webm)$/i.test(name)
  );
};

export function IncomingShareModal() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<SharedDataPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [activeStackIndex, setActiveStackIndex] = useState(0);

  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const handleNextStack = useCallback(() => {
    const currentPayload = payloadRef.current;
    if (!currentPayload || currentPayload.files.length === 0) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setActiveStackIndex((prev) => (prev + 1) % currentPayload.files.length);
  }, []);

  const handlePrevStack = useCallback(() => {
    const currentPayload = payloadRef.current;
    if (!currentPayload || currentPayload.files.length === 0) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setActiveStackIndex((prev) => (prev - 1 + currentPayload.files.length) % currentPayload.files.length);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -25) {
          handleNextStack();
        } else if (gestureState.dx > 25) {
          handlePrevStack();
        } else if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          handleNextStack();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!user) return;

    getInitialShare().then((initialData) => {
      if (initialData) {
        setPayload(initialData);
      }
    });

    const unsubscribe = subscribeToShares((newData) => {
      if (newData) {
        setPayload(newData);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (payload) {
      setActiveStackIndex(0);
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
  }, [payload]);

  if (!payload || !user) {
    return null;
  }

  const animateClose = (callback?: () => void) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
      clearShare().catch(() => undefined);
      setPayload(null);
      if (callback) {
        callback();
      }
    });
  };

  const mediaFiles = payload.files.filter((f) => isMediaFile(f.fileName, f.mimeType));
  const documentFiles = payload.files.filter((f) => !isMediaFile(f.fileName, f.mimeType));
  const hasMedia = mediaFiles.length > 0;
  const hasDocuments = documentFiles.length > 0;
  const isTextOnly = payload.files.length === 0 && Boolean(payload.text);

  const handleSaveDriveFiles = async (
    filesToSave: { uri: string; fileName: string; mimeType: string; fileSize: number }[]
  ) => {
    const createdItems: DriveItem[] = [];

    for (const file of filesToSave) {
      let permanentUri = file.uri;
      if (FileSystem.documentDirectory) {
        try {
          const cleanName = (file.fileName || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
          const targetUri = `${FileSystem.documentDirectory}drive_${Date.now()}_${cleanName}`;
          await FileSystem.copyAsync({ from: file.uri, to: targetUri });
          permanentUri = targetUri;
        } catch (_copyErr) {
          void 0;
        }
      }

      const category = getFileCategory(file.fileName, file.mimeType);
      const sizeFormatted = formatBytes(file.fileSize) || "1.0 MB";

      const driveItem: DriveItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.fileName,
        category,
        size: sizeFormatted,
        updatedAt: String(Date.now()),
        uri: permanentUri,
        mimeType: file.mimeType,
        createdAt: Date.now(),
        uploading: true,
      };

      createdItems.push(driveItem);
    }

    if (isTextOnly && payload.text) {
      const textItem: DriveItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `${payload.subject || "Shared Text"}.txt`,
        category: "document",
        size: "1 KB",
        updatedAt: String(Date.now()),
        createdAt: Date.now(),
        uploading: false,
      };
      createdItems.push(textItem);
    }

    if (createdItems.length > 0) {
      const existing = await loadDriveItems();
      await saveDriveItems([...createdItems, ...existing]);

      const primaryName = createdItems[0].name;
      emitDriveToast(primaryName, "uploading", "Uploading to Cloud Storage...");

      for (const item of createdItems) {
        if (!item.uri) continue;
        saveDriveItemToServer(item).catch(() => undefined);
        uploadDriveFileToCloudflare(item).then((res) => {
          if (res.success && res.url) {
            loadDriveItems().then((items) => {
              saveDriveItems(
                items.map((i) =>
                  i.id === item.id
                    ? {
                        ...i,
                        cloudflareUrl: res.url,
                        cloudflareKey: res.key,
                        uploading: false,
                      }
                    : i
                )
              );
            });
            emitDriveToast(item.name, "success", "Saved to Cloud Storage");
          } else {
            loadDriveItems().then((items) => {
              saveDriveItems(
                items.map((i) => (i.id === item.id ? { ...i, uploading: false } : i))
              );
            });
            emitDriveToast(item.name, "success", "Saved locally");
          }
        }).catch(() => {
          emitDriveToast(item.name, "success", "Saved locally");
        });
      }
    }

    return createdItems;
  };

  const handleSaveGalleryFiles = async (
    filesToSave: { uri: string; fileName: string; mimeType: string; fileSize: number }[]
  ) => {
    for (const file of filesToSave) {
      let permanentUri = file.uri;
      if (FileSystem.documentDirectory) {
        try {
          const cleanName = (file.fileName || "media").replace(/[^a-zA-Z0-9._-]/g, "_");
          const targetUri = `${FileSystem.documentDirectory}gallery_${Date.now()}_${cleanName}`;
          await FileSystem.copyAsync({ from: file.uri, to: targetUri });
          permanentUri = targetUri;
        } catch (_copyErr) {
          void 0;
        }
      }

      const isVideo =
        file.mimeType.includes("video") ||
        /\.(mp4|mov|mkv|webm)$/i.test(file.fileName);
      const thumb = isVideo ? permanentUri : await createLocalThumbnail(permanentUri);

      const newPin: GalleryPin = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        imageUrl: permanentUri,
        thumbnailUrl: thumb,
        fileName: file.fileName,
        mediaType: isVideo ? "video" : "image",
        aspectRatio: 1,
        likes: 0,
        saved: false,
        uploadStatus: "uploading",
        fileSize: file.fileSize,
        fileSizeFormatted: formatBytes(file.fileSize),
        mimeType: file.mimeType,
        createdAt: Date.now(),
      };

      await addGalleryPinToServer(newPin);

      uploadFileToMarkx(permanentUri, file.mimeType, file.fileName).then((cfRes) => {
        if (cfRes.success && cfRes.url) {
          addGalleryPinToServer({ ...newPin, imageUrl: cfRes.url, uploadStatus: "synced" });
          if (permanentUri !== file.uri) {
            FileSystem.deleteAsync(permanentUri, { idempotent: true }).catch(() => {});
          }
        } else {
          addGalleryPinToServer({ ...newPin, uploadStatus: "synced" });
        }
      }).catch(() => undefined);
    }
  };

  const handleSave = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (hasMedia && !hasDocuments) {
        await handleSaveGalleryFiles(mediaFiles);
        animateClose(() => {
          router.push("/(main)/gallery");
        });
      } else if (!hasMedia && (hasDocuments || isTextOnly)) {
        const createdItems = await handleSaveDriveFiles(documentFiles);
        const toastName = createdItems[0]?.name || "Shared Document";
        animateClose(() => {
          router.push({
            pathname: "/(main)/drive",
            params: { toastFileName: toastName, toastDetail: "Uploading to Cloud Storage..." },
          });
        });
      } else if (hasMedia && hasDocuments) {
        await handleSaveGalleryFiles(mediaFiles);
        const createdItems = await handleSaveDriveFiles(documentFiles);
        const toastName = createdItems[0]?.name || "Shared Files";
        animateClose(() => {
          router.push({
            pathname: "/(main)/drive",
            params: { toastFileName: toastName, toastDetail: "Uploading to Cloud Storage..." },
          });
        });
      }
    } catch (_err) {
      void 0;
    } finally {
      setIsProcessing(false);
    }
  };

  const totalFilesCount = payload.files.length;
  const isMultiple = totalFilesCount > 1;
  const totalBytes = payload.files.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  const firstFile = payload.files[0];
  const isFirstVideo =
    firstFile &&
    (firstFile.mimeType.includes("video") || /\.(mp4|mov|mkv|webm)$/i.test(firstFile.fileName));

  const sheetTitle =
    hasMedia && !hasDocuments
      ? "Save to Gallery"
      : !hasMedia && (hasDocuments || isTextOnly)
      ? "Save to Drive"
      : "Save to Mark-X";


  return (
    <Modal visible animationType="none" transparent statusBarTranslucent onRequestClose={() => animateClose()}>
      <View className="flex-1 justify-end">
        <TouchableWithoutFeedback onPress={() => (isProcessing ? void 0 : animateClose())}>
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

        <TouchableWithoutFeedback>
          <Animated.View
            className="bg-white rounded-t-[32px] px-6 pt-3 shadow-2xl relative border-t border-black/[0.05]"
            style={{
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 20) + 14,
              maxHeight: SCREEN_HEIGHT * 0.9,
            }}
          >
            <View className="items-center py-1 mb-2">
              <View className="w-10 h-1 rounded-full bg-black/15" />
            </View>

            <View className="items-center mb-4">
              <Text className="text-[20px] font-outfit-bold text-[#1C1C1E] text-center tracking-tight">
                {sheetTitle}
              </Text>
              <Text className="text-[13px] font-outfit text-[#8E8E93] text-center mt-0.5">
                Review and save shared content
              </Text>
            </View>

            {totalFilesCount >= 3 ? (
              <View className="w-full bg-[#F8F8FA] rounded-[22px] p-3.5 border border-black/[0.05] mb-4">
                <View className="flex-row items-center justify-between mb-2 px-1">
                  <View className="flex-row items-center">
                    <Ionicons name="copy-outline" size={14} color="#1C1C1E" style={{ marginRight: 5 }} />
                    <Text className="text-[13px] font-outfit-bold text-[#1C1C1E]">
                      {totalFilesCount} Files
                    </Text>
                  </View>
                  <Text className="text-[11.5px] font-outfit-medium text-[#8E8E93]">
                    {formatBytes(totalBytes)} Total
                  </Text>
                </View>

                <View className="items-center justify-center py-1 relative" style={{ height: 126 }}>
                  <View
                    style={{
                      position: "absolute",
                      width: 164,
                      height: 106,
                      backgroundColor: "#F0F0F4",
                      borderRadius: 18,
                      transform: [{ rotate: "2.5deg" }, { scale: 0.92 }],
                      opacity: 0.8,
                    }}
                    className="shadow-sm"
                  />

                  <View
                    style={{
                      position: "absolute",
                      width: 170,
                      height: 110,
                      backgroundColor: "#F7F7FA",
                      borderRadius: 18,
                      transform: [{ rotate: "-2.5deg" }, { scale: 0.96 }],
                      opacity: 0.95,
                    }}
                    className="shadow-sm"
                  />

                  {(() => {
                    const currFile = payload.files[activeStackIndex] || payload.files[0];
                    const isCurrImg = isMediaFile(currFile.fileName, currFile.mimeType);
                    const isCurrVid =
                      currFile.mimeType.includes("video") || /\.(mp4|mov|mkv|webm)$/i.test(currFile.fileName);

                    return (
                      <View
                        {...panResponder.panHandlers}
                        style={{
                          width: 178,
                          height: 116,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 18,
                          transform: [{ rotate: "0deg" }],
                        }}
                        className="p-2.5 items-center justify-center shadow-md shadow-black/5 relative"
                      >
                        <View className="absolute top-2 right-2 bg-black/[0.04] px-1.5 py-0.5 rounded-full">
                          <Text className="text-[9.5px] font-outfit-bold text-[#1C1C1E]">
                            {activeStackIndex + 1}/{totalFilesCount}
                          </Text>
                        </View>

                        <View
                          style={{ width: 48, height: 48 }}
                          className="items-center justify-center overflow-hidden mb-1 relative"
                        >
                          {isCurrImg ? (
                            <Image
                              source={{ uri: currFile.uri }}
                              style={{ width: 48, height: 48, borderRadius: 10 }}
                              contentFit="cover"
                            />
                          ) : (
                            <FileCategoryIcon
                              category={getFileCategory(currFile.fileName, currFile.mimeType)}
                              fileName={currFile.fileName}
                              uri={currFile.uri}
                              size={30}
                            />
                          )}
                          {isCurrVid ? (
                            <View
                              style={{ width: 48, height: 48 }}
                              className="absolute inset-0 bg-black/25 rounded-[10px] items-center justify-center"
                            >
                              <Ionicons name="play" size={14} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </View>

                        <Text
                          className="text-[#1C1C1E] text-[11.5px] font-outfit-bold text-center px-1"
                          numberOfLines={1}
                        >
                          {currFile.fileName}
                        </Text>
                        <Text className="text-[#8E8E93] text-[10px] font-outfit mt-0.5">
                          {formatBytes(currFile.fileSize)}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
            ) : totalFilesCount === 2 ? (
              <View className="w-full bg-[#F8F8FA] rounded-[22px] p-3.5 border border-black/[0.05] mb-4">
                <View className="flex-row items-center justify-between mb-2.5 px-1">
                  <Text className="text-[13px] font-outfit-bold text-[#1C1C1E]">
                    2 Files
                  </Text>
                  <Text className="text-[11.5px] font-outfit-medium text-[#8E8E93]">
                    {formatBytes(totalBytes)} Total
                  </Text>
                </View>

                <View className="flex-row items-center justify-center gap-3 w-full">
                  {payload.files.map((file, idx) => {
                    const isVid = file.mimeType.includes("video") || /\.(mp4|mov|mkv|webm)$/i.test(file.fileName);
                    const isImg = isMediaFile(file.fileName, file.mimeType);
                    return (
                      <View
                        key={`${file.filePath}_${idx}`}
                        style={{ flex: 1, maxWidth: 145, height: 114 }}
                        className="bg-white rounded-[18px] p-2.5 items-center justify-center shadow-sm"
                      >
                        <View
                          style={{ width: 48, height: 48 }}
                          className="items-center justify-center overflow-hidden mb-1.5 relative"
                        >
                          {isImg ? (
                            <Image
                              source={{ uri: file.uri }}
                              style={{ width: 48, height: 48, borderRadius: 10 }}
                              contentFit="cover"
                            />
                          ) : (
                            <FileCategoryIcon
                              category={getFileCategory(file.fileName, file.mimeType)}
                              fileName={file.fileName}
                              uri={file.uri}
                              size={32}
                            />
                          )}
                          {isVid ? (
                            <View
                              style={{ width: 48, height: 48 }}
                              className="absolute inset-0 bg-black/25 rounded-[10px] items-center justify-center"
                            >
                              <Ionicons name="play" size={15} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </View>
                        <Text
                          className="text-[#1C1C1E] text-[11.5px] font-outfit-semibold text-center px-1"
                          numberOfLines={1}
                        >
                          {file.fileName}
                        </Text>
                        <Text className="text-[#8E8E93] text-[10px] font-outfit mt-0.5">
                          {formatBytes(file.fileSize)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : firstFile ? (
              hasMedia ? (
                <View className="w-full bg-[#F8F8FA] rounded-[22px] p-4 items-center border border-black/[0.05] mb-4">
                  <View
                    style={{ width: 96, height: 96 }}
                    className="rounded-[18px] overflow-hidden mb-2.5 shadow-md shadow-black/10 relative items-center justify-center"
                  >
                    <Image
                      source={{ uri: firstFile.uri }}
                      style={{ width: 96, height: 96, borderRadius: 18 }}
                      contentFit="cover"
                    />
                    {isFirstVideo ? (
                      <View className="absolute inset-0 bg-black/30 items-center justify-center">
                        <View className="w-9 h-9 rounded-full bg-black/50 items-center justify-center">
                          <Ionicons name="play" size={17} color="#FFFFFF" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-[13.5px] font-outfit-bold text-[#1C1C1E] text-center px-3" numberOfLines={1}>
                    {firstFile.fileName}
                  </Text>
                  <Text className="text-[11px] font-outfit text-[#8E8E93] mt-0.5 text-center">
                    {formatBytes(firstFile.fileSize)} • {isFirstVideo ? "Video" : "Photo"}
                  </Text>
                </View>
              ) : (
                <View className="w-full bg-[#F8F8FA] rounded-[22px] p-5 items-center border border-black/[0.05] mb-4">
                  <View className="items-center justify-center mb-2.5">
                    <FileCategoryIcon
                      category={getFileCategory(firstFile.fileName, firstFile.mimeType)}
                      fileName={firstFile.fileName}
                      uri={firstFile.uri}
                      size={42}
                    />
                  </View>
                  <Text className="text-[15.5px] font-outfit-bold text-[#1C1C1E] text-center px-2" numberOfLines={2}>
                    {firstFile.fileName}
                  </Text>
                  <View className="flex-row items-center mt-2 px-3 py-1 rounded-full">
                    <Text className="text-[12px] font-outfit-medium text-[#8E8E93]">
                      {formatBytes(firstFile.fileSize)} • {(firstFile.fileName.split(".").pop() || "File").toUpperCase()}
                    </Text>
                  </View>
                </View>
              )
            ) : isTextOnly ? (
              <View className="w-full bg-[#F8F8FA] rounded-[22px] p-5 items-center border border-black/[0.05] mb-4">
                <View className="items-center justify-center mb-2.5">
                  <Ionicons name="document-text" size={36} color="#1C1C1E" />
                </View>
                <Text className="text-[15.5px] font-outfit-bold text-[#1C1C1E] text-center px-2" numberOfLines={1}>
                  {payload.subject || "Shared Text Document"}
                </Text>
                <Text className="text-[12.5px] font-outfit text-[#8E8E93] text-center mt-1 px-3" numberOfLines={2}>
                  {payload.text}
                </Text>
              </View>
            ) : null}

            <View className="flex-row items-center gap-3 w-full">
              <TouchableOpacity
                onPress={() => animateClose()}
                disabled={isProcessing}
                activeOpacity={0.7}
                className="flex-1 py-3.5 bg-[#F2F2F7] active:bg-[#E5E5EA] rounded-[16px] items-center justify-center border border-black/[0.04]"
              >
                <Text className="text-[15.5px] font-outfit-semibold text-[#1C1C1E]">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isProcessing}
                activeOpacity={0.85}
                className="flex-1 py-3.5 bg-[#1C1C1E] active:bg-black rounded-[16px] items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-[15.5px] font-outfit-bold text-white">
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}
