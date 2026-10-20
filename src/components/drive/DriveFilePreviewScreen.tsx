import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DriveFileCategory, DriveItem, getFileDisplayName } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";
import { DrivePdfViewer } from "./DrivePdfViewer";
import { FileCategoryIcon } from "./FileCategoryIcon";
import { openInNativeApp, getRecommendedAppName } from "../../services/nativeFileOpenerService";
import { DrivePreviewActionSheet } from "./DrivePreviewActionSheet";
import { exportDriveFile } from "../../services/driveFirebaseService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

async function parseNativeDocxContent(uri: string): Promise<string[] | null> {
  try {
    if (!uri) return null;

    let targetUri = uri;
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      const safeName = `temp_${Date.now()}.docx`;
      const cachePath = `${FileSystem.cacheDirectory}${safeName}`;
      const downloadRes = await FileSystem.downloadAsync(uri, cachePath);
      if (downloadRes.status === 200 && downloadRes.uri) {
        targetUri = downloadRes.uri;
      }
    }

    const raw = await FileSystem.readAsStringAsync(targetUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (raw && (raw.includes("<w:t") || raw.includes("<w:p"))) {
      const paragraphMatches = raw.match(/<w:p[\s\S]*?<\/w:p>/g);
      if (paragraphMatches && paragraphMatches.length > 0) {
        const parsedParagraphs: string[] = [];
        for (const pXml of paragraphMatches) {
          const textMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
          if (textMatches) {
            const pText = textMatches
              .map((t) => t.replace(/<[^>]+>/g, "").trim())
              .filter(Boolean)
              .join(" ");
            if (pText) {
              parsedParagraphs.push(pText);
            }
          }
        }
        if (parsedParagraphs.length > 0) {
          return parsedParagraphs;
        }
      }
    }
  } catch (err) {
    console.warn("[NativeDocxParser] Error parsing XML:", err);
  }
  return null;
}

interface DriveFilePreviewScreenProps {
  visible: boolean;
  item: DriveItem | null;
  allItems?: DriveItem[];
  parentFolderName?: string;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onMove?: (item: DriveItem) => void;
  onOptionsPress?: (item: DriveItem) => void;
  onToggleStar?: (item: DriveItem) => void;
}

export function DriveFilePreviewScreen({
  visible,
  item,
  allItems,
  parentFolderName,
  onClose,
  onDelete,
  onRename,
  onMove,
  onOptionsPress,
  onToggleStar,
}: DriveFilePreviewScreenProps) {
  const insets = useSafeAreaInsets();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isStarred, setIsStarred] = useState<boolean>(item?.starred || false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [docParagraphs, setDocParagraphs] = useState<string[] | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const isMountedRef = useRef(true);

  const isLoading = isLoadingText || isLoadingPdf;

  useEffect(() => {
    if (!visible) setShowActionSheet(false);
  }, [visible]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      progressAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: false,
        })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isLoading, progressAnim]);

  useEffect(() => {
    if (!isMountedRef.current) return;
    setIsStarred(item?.starred || false);
    setTextContent(null);
    setDocParagraphs(null);
    setFullScreenImage(false);
    setIsLoadingPdf(false);
    setShowJumpModal(false);

    if (!item || !item.uri) return;

    const isWordDocument =
      item.category === "document" ||
      item.name.toLowerCase().endsWith(".docx") ||
      item.name.toLowerCase().endsWith(".doc") ||
      item.name.toLowerCase().endsWith(".odt") ||
      item.name.toLowerCase().endsWith(".rtf");

    if (isWordDocument && item.uri) {
      setIsLoadingText(true);
      parseNativeDocxContent(item.uri)
        .then((paras) => {
          if (isMountedRef.current) setDocParagraphs(paras);
        })
        .finally(() => {
          if (isMountedRef.current) setIsLoadingText(false);
        });
    } else {
      const isTextReadable =
        item.category === "code" ||
        item.name.endsWith(".txt") ||
        item.name.endsWith(".md") ||
        item.name.endsWith(".json") ||
        item.name.endsWith(".csv") ||
        item.name.endsWith(".xml") ||
        item.name.endsWith(".html") ||
        item.name.endsWith(".css") ||
        item.name.endsWith(".js") ||
        item.name.endsWith(".ts") ||
        item.name.endsWith(".tsx") ||
        item.name.endsWith(".jsx") ||
        item.name.endsWith(".py") ||
        item.name.endsWith(".log");

      if (isTextReadable && item.uri.startsWith("file://")) {
        setIsLoadingText(true);
        FileSystem.readAsStringAsync(item.uri)
          .then((content) => {
            if (isMountedRef.current) setTextContent(content);
          })
          .catch(() => {
            if (isMountedRef.current) setTextContent(null);
          })
          .finally(() => {
            if (isMountedRef.current) setIsLoadingText(false);
          });
      }
    }
  }, [item]);

  if (!item) return null;

  const isPdf = item.category === "pdf" || item.name.toLowerCase().endsWith(".pdf");

  const handleShare = async () => {
    triggerHaptic();
    try {
      await exportDriveFile(item);
    } catch (e) {
      console.warn("Share error:", e);
    }
  };

  const handleCopyText = async () => {
    if (textContent) {
      triggerHaptic();
      await Clipboard.setStringAsync(textContent);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const categoryColorMap: Record<DriveFileCategory, string> = {
    pdf: "#EA4335",
    document: "#4285F4",
    spreadsheet: "#34A853",
    presentation: "#FBBC04",
    code: "#A142F4",
    archive: "#E37400",
    image: "#24C1E0",
    video: "#FA7B17",
    audio: "#F439A0",
    folder: "#5F6368",
    other: "#5F6368",
  };

  const themeColor = categoryColorMap[item.category] || "#4285F4";

  const renderPreviewBody = () => {
    if (isPdf) {
      return (
        <DrivePdfViewer
          item={item}
          onLoadingChange={setIsLoadingPdf}
          showJumpModal={showJumpModal}
          onCloseJumpModal={() => setShowJumpModal(false)}
          onRequestClose={onClose}
        />
      );
    }

    if (isLoadingText) {
      return (
        <View className="flex-1 items-center justify-center py-20 bg-white rounded-3xl border border-[#E8EAED]">
          <ActivityIndicator size="large" color={themeColor} />
          <Text className="text-[14px] font-outfit-bold text-[#1F1F1F] mt-4">Reading document content...</Text>
          <Text className="text-[12px] font-outfit text-[#70757A] mt-1">Extracting plain text & structure</Text>
        </View>
      );
    }

    if (textContent !== null) {
      const lines = textContent.split("\n");
      const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
      const charCount = textContent.length;

      return (
        <View className="flex-1 bg-[#1E1E1E] rounded-3xl overflow-hidden border border-[#2D2D2D]">
          <View className="flex-row items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#333333]">
            <View className="flex-row items-center space-x-2">
              <View className="px-2 py-0.5 rounded bg-[#333333]">
                <Text className="text-[11px] font-outfit-bold text-[#A8C7FA]">
                  {item.name.split(".").pop()?.toUpperCase() || "TEXT"}
                </Text>
              </View>
              <Text className="text-[12px] font-outfit text-[#CCCCCC]">
                {lines.length} lines • {wordCount} words • {charCount} chars
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCopyText}
              className={`px-3 py-1.5 rounded-full flex-row items-center ${copiedToast ? "bg-[#34A853]" : "bg-[#0B57D0]"
                }`}
            >
              <Ionicons
                name={copiedToast ? "checkmark" : "copy-outline"}
                size={13}
                color="#FFFFFF"
                style={{ marginRight: 4 }}
              />
              <Text className="text-[11px] font-outfit-bold text-white">
                {copiedToast ? "Copied!" : "Copy Text"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4 bg-[#1E1E1E]" showsVerticalScrollIndicator={true}>
            {lines.map((line, idx) => (
              <View key={idx} className="flex-row py-0.5">
                <Text className="text-[11px] font-mono text-[#555555] w-10 text-right mr-3 select-none">
                  {idx + 1}
                </Text>
                <Text className="flex-1 font-mono text-[#D4D4D4] text-[13px] leading-5">
                  {line || " "}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (item.category === "image" && item.uri) {
      return (
        <View className="flex-1 rounded-3xl overflow-hidden bg-black items-center justify-center border border-[#1F1F1F] relative">
          <Image
            source={{ uri: item.uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            transition={300}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              triggerHaptic();
              setFullScreenImage(!fullScreenImage);
            }}
            className="absolute bottom-4 right-4 bg-black/60 px-3 py-1.5 rounded-full flex-row items-center border border-white/20"
          >
            <Ionicons name="scan-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text className="text-[11px] font-outfit-semibold text-white">Tap for full focus</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if ((item.category === "video" || item.category === "audio") && item.uri) {
      return (
        <View className="flex-1 bg-[#121212] rounded-3xl p-6 border border-[#222222] items-center justify-center">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6 border border-[#2A2A2A]"
            style={{ backgroundColor: `${themeColor}20` }}
          >
            <Ionicons
              name={item.category === "video" ? "videocam" : "musical-notes"}
              size={48}
              color={themeColor}
            />
          </View>

          <Text className="text-[20px] font-outfit-bold text-white text-center mb-1">
            {getFileDisplayName(item.name, item.isFolder)}
          </Text>
          <Text className="text-[13px] font-outfit text-[#888888] text-center mb-6">
            Media File • {item.size || "Unknown Size"}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleShare}
            className="w-full py-3.5 rounded-2xl bg-[#0B57D0] flex-row items-center justify-center"
          >
            <Ionicons name="play-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text className="text-[15px] font-outfit-bold text-white">Open Media</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const appName = getRecommendedAppName(item.name);
    return (
      <View className="flex-1 bg-white m-3 rounded-3xl p-6 border border-[#E8EAED] items-center justify-between">
        <View className="items-center justify-center pt-8 w-full">
          <View
            className="w-24 h-24 rounded-3xl items-center justify-center mb-6 shadow-sm"
            style={{ backgroundColor: `${themeColor}15` }}
          >
            <FileCategoryIcon category={item.category} size={54} id={item.id} fileName={item.name} />
          </View>

          <Text className="text-[20px] font-outfit-bold text-[#1F1F1F] text-center mb-1.5 px-4" numberOfLines={2}>
            {getFileDisplayName(item.name, item.isFolder)}
          </Text>

          <View className="flex-row items-center gap-2 mt-1 mb-5">
            <View className="px-2.5 py-0.5 rounded-full bg-[#F1F3F4] border border-[#E0E0E0]">
              <Text className="text-[11px] font-outfit-semibold text-[#5F6368] uppercase">
                {item.name.split(".").pop() || item.category}
              </Text>
            </View>
            <Text className="text-[12px] font-outfit text-[#5F6368]">
              {item.size || "Original Document"}
            </Text>
          </View>

          <View className="bg-[#F8F9FA] border border-[#E8EAED] rounded-2xl p-4 w-full">
            <View className="flex-row items-center mb-1.5">
              <Ionicons name="information-circle-outline" size={16} color={themeColor} style={{ marginRight: 6 }} />
              <Text className="text-[12px] font-outfit-bold text-[#1F1F1F]">Full-Fidelity Native Viewing</Text>
            </View>
            <Text className="text-[12px] font-outfit text-[#5F6368] leading-5">
              To preserve authentic animations, formatting, and fonts, this file opens directly in your phone's native {appName} app.
            </Text>
          </View>
        </View>

        <View className="w-full gap-3 pb-2">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openInNativeApp(item)}
            className="w-full py-3.5 rounded-full flex-row items-center justify-center shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            <Ionicons name="open-outline" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text className="text-[15px] font-outfit-bold text-white">
              Open in {appName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleShare}
            className="w-full py-3.5 rounded-full bg-[#F1F3F4] border border-[#E0E0E0] flex-row items-center justify-center"
          >
            <Ionicons name="share-outline" size={18} color="#444746" style={{ marginRight: 8 }} />
            <Text className="text-[14px] font-outfit-semibold text-[#444746]">
              Share / Export File
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const categoryBadgeStyles: Record<DriveFileCategory, { bg: string; text: string; border: string }> = {
    pdf: { bg: "#3D0A0E", text: "#FF4D4D", border: "#7F1D1D" },
    document: { bg: "#0A2540", text: "#38BDF8", border: "#1E3A8A" },
    spreadsheet: { bg: "#09301B", text: "#4ADE80", border: "#14532D" },
    presentation: { bg: "#3D2C06", text: "#FACC15", border: "#713F12" },
    code: { bg: "#280A3D", text: "#C084FC", border: "#581C87" },
    archive: { bg: "#3B1E0A", text: "#FB923C", border: "#7C2D12" },
    image: { bg: "#0A333A", text: "#38BDF8", border: "#115E59" },
    video: { bg: "#3B1E0A", text: "#F97316", border: "#7C2D12" },
    audio: { bg: "#3B0A26", text: "#F472B6", border: "#831843" },
    folder: { bg: "#1A1A1A", text: "#CCCCCC", border: "#333333" },
    other: { bg: "#1A1A1A", text: "#CCCCCC", border: "#333333" },
  };

  const badgeStyle = categoryBadgeStyles[item.category] || categoryBadgeStyles.other;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-[#1E1F22]" style={{ paddingTop: insets.top }}>
        <StatusBar style="light" />

        <View className="bg-[#1E1F22] border-b border-[#2B2D31] z-10">
          <View className="flex-row items-center justify-between px-4 py-3.5 min-h-[64px]">
            <View className="flex-row items-center flex-1 mr-2 space-x-1.5">
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  onClose();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="p-1 active:opacity-60"
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              <Text className="flex-1 text-[18px] font-outfit-medium text-white ml-1" numberOfLines={1}>
                {getFileDisplayName(item.name, item.isFolder)}
              </Text>
            </View>

            <View className="flex-row items-center space-x-7">
              {isPdf && (
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    setShowJumpModal(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="p-1 active:opacity-60"
                >
                  <Ionicons name="search-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleShare}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="p-1 active:opacity-60"
              >
                <Ionicons name="share-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setShowActionSheet(true);
                  onOptionsPress?.(item);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="p-1 active:opacity-60"
              >
                <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {isLoading && (
            <View className="h-[3px] w-full bg-[#2B2D31] overflow-hidden">
              <Animated.View
                style={{
                  height: 3,
                  backgroundColor: "#1A73E8",
                  width: "45%",
                  transform: [
                    {
                      translateX: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-SCREEN_WIDTH * 0.45, SCREEN_WIDTH],
                      }),
                    },
                  ],
                }}
              />
            </View>
          )}
        </View>

        <View className="flex-1 bg-[#121212]">{renderPreviewBody()}</View>
      </View>

      <DrivePreviewActionSheet
        visible={showActionSheet}
        item={item}
        allItems={allItems}
        parentFolderName={parentFolderName}
        onClose={() => setShowActionSheet(false)}
        onDelete={(id) => {
          setShowActionSheet(false);
          onDelete?.(id);
          onClose();
        }}
        onRename={(id, newName) => {
          onRename?.(id, newName);
        }}
        onMove={(targetItem) => {
          setShowActionSheet(false);
          onMove?.(targetItem);
        }}
        onExport={() => {
          handleShare();
        }}
        onOpenInNativeApp={(targetItem) => {
          openInNativeApp(targetItem);
        }}
        onToggleStar={(targetItem) => {
          setIsStarred((prev) => !prev);
          onToggleStar?.(targetItem);
        }}
      />
    </Modal>
  );
}

export const DriveFilePreviewModal = DriveFilePreviewScreen;
