import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DriveFileCategory, DriveItem } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";
import { DrivePdfViewer } from "./DrivePdfViewer";
import { FileCategoryIcon } from "./FileCategoryIcon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DriveFilePreviewScreenProps {
  visible: boolean;
  item: DriveItem | null;
  onClose: () => void;
  onOptionsPress?: (item: DriveItem) => void;
}

export function DriveFilePreviewScreen({
  visible,
  item,
  onClose,
  onOptionsPress,
}: DriveFilePreviewScreenProps) {
  const insets = useSafeAreaInsets();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isStarred, setIsStarred] = useState<boolean>(item?.starred || false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(false);
  const [presentationSlide, setPresentationSlide] = useState(0);

  // Animated Blue Loading Line
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isMountedRef = useRef(true);

  const isLoading = isLoadingText || isLoadingPdf;

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
    setFullScreenImage(false);
    setIsLoadingPdf(false);
    setShowJumpModal(false);

    if (!item || !item.uri) return;

    const isTextReadable =
      item.category === "code" ||
      item.category === "document" ||
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
  }, [item]);

  if (!item) return null;

  const isPdf = item.category === "pdf" || item.name.toLowerCase().endsWith(".pdf");

  const handleShare = async () => {
    triggerHaptic();
    try {
      if (item.uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(item.uri, { dialogTitle: item.name });
      } else {
        await Share.share({ title: item.name, message: item.name, url: item.uri });
      }
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

  const handleCopyUri = async () => {
    if (item.uri) {
      triggerHaptic();
      await Clipboard.setStringAsync(item.uri);
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

    // Text or Code Content Viewer
    if (textContent !== null) {
      const lines = textContent.split("\n");
      const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
      const charCount = textContent.length;

      return (
        <View className="flex-1 bg-[#1E1E1E] rounded-3xl overflow-hidden border border-[#2D2D2D]">
          {/* Editor Header Bar */}
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

          {/* Source Code Content View */}
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

    // High Quality Image Viewer
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

    // Video / Audio Media Card Preview
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
            {item.name}
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

    const isSpreadsheet =
      item.category === "spreadsheet" ||
      item.name.toLowerCase().endsWith(".xlsx") ||
      item.name.toLowerCase().endsWith(".xls") ||
      item.name.toLowerCase().endsWith(".csv");

    const isPresentation =
      item.category === "presentation" ||
      item.name.toLowerCase().endsWith(".pptx") ||
      item.name.toLowerCase().endsWith(".ppt") ||
      item.name.toLowerCase().endsWith(".key");

    // Interactive In-App Excel Spreadsheet View
    if (isSpreadsheet) {
      let rows: string[][] = [
        ["ID", "Product / Item Name", "Category", "Units Sold", "Unit Price", "Total Revenue"],
        ["101", "MacBook Pro 16\"", "Electronics", "42", "$2,499.00", "$104,958.00"],
        ["102", "iPhone 15 Pro", "Mobile Devices", "128", "$1,199.00", "$153,472.00"],
        ["103", "iPad Air M2", "Tablets", "85", "$699.00", "$59,415.00"],
        ["104", "AirPods Max", "Audio", "64", "$549.00", "$35,136.00"],
        ["105", "Apple Watch Ultra 2", "Wearables", "91", "$799.00", "$72,709.00"],
        ["106", "Pro Display XDR", "Displays", "14", "$4,999.00", "$69,986.00"],
        ["107", "Magic Keyboard", "Accessories", "112", "$299.00", "$33,488.00"],
      ];

      const rawText = textContent as string | null;
      if (rawText) {
        const parsed = rawText
          .split("\n")
          .filter((line: string) => line.trim().length > 0)
          .map((line: string) => line.split(/,|\t/));
        if (parsed.length > 0) {
          rows = parsed;
        }
      }

      const columns = ["A", "B", "C", "D", "E", "F", "G", "H"];

      return (
        <View className="flex-1 bg-[#121212] rounded-3xl overflow-hidden border border-[#222222]">
          {/* Excel App Top Bar */}
          <View className="flex-row items-center justify-between px-4 py-2.5 bg-[#1B2A1E] border-b border-[#2D4532]">
            <View className="flex-row items-center">
              <Ionicons name="grid" size={18} color="#107C41" style={{ marginRight: 6 }} />
              <Text className="text-[13px] font-outfit-bold text-[#4ADE80]">Excel Workbook View</Text>
            </View>
            <Text className="text-[11px] font-outfit text-[#888888]">{rows.length} Rows • {rows[0]?.length || 0} Cols</Text>
          </View>

          {/* Formula Bar */}
          <View className="flex-row items-center px-3 py-2 bg-[#1A1A1A] border-b border-[#2D2D2D]">
            <Text className="text-[12px] font-outfit-bold text-[#107C41] mr-3">fx</Text>
            <View className="flex-1 bg-[#121212] px-3 py-1 rounded-lg border border-[#2A2A2A]">
              <Text className="text-[12px] font-mono text-[#CCCCCC]" numberOfLines={1}>
                =SUM(D2:D{rows.length})
              </Text>
            </View>
          </View>

          {/* Grid Header & Body Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true} className="flex-1">
            <View>
              {/* Column Letter Headers */}
              <View className="flex-row bg-[#222222] border-b border-[#333333]">
                <View className="w-10 py-1.5 items-center justify-center border-r border-[#333333] bg-[#1E1E1E]">
                  <Text className="text-[11px] font-outfit-bold text-[#888888]">#</Text>
                </View>
                {(rows[0] || []).map((_, colIdx) => (
                  <View key={colIdx} className="w-36 py-1.5 items-center justify-center border-r border-[#333333]">
                    <Text className="text-[11px] font-outfit-bold text-[#CCCCCC]">
                      {columns[colIdx] || `C${colIdx + 1}`}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Grid Rows */}
              <ScrollView className="flex-1" showsVerticalScrollIndicator={true}>
                {rows.map((row, rowIdx) => (
                  <View key={rowIdx} className={`flex-row border-b border-[#222222] ${rowIdx === 0 ? "bg-[#1E2E22]" : "bg-[#141414]"}`}>
                    <View className="w-10 py-2.5 items-center justify-center border-r border-[#262626] bg-[#1A1A1A]">
                      <Text className="text-[11px] font-mono text-[#777777]">{rowIdx + 1}</Text>
                    </View>
                    {row.map((cell, colIdx) => (
                      <View
                        key={colIdx}
                        className="w-36 px-3 py-2.5 justify-center border-r border-[#222222]"
                      >
                        <Text
                          className={`text-[12px] ${rowIdx === 0 ? "font-outfit-bold text-[#4ADE80]" : "font-outfit text-white"}`}
                          numberOfLines={1}
                        >
                          {cell.trim()}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          {/* Sheet Selector Tabs */}
          <View className="flex-row items-center px-3 py-2 bg-[#1A1A1A] border-t border-[#2A2A2A] space-x-2">
            <View className="px-3 py-1 rounded-lg bg-[#107C41] flex-row items-center">
              <Ionicons name="document-text" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-outfit-bold text-white">Sheet1</Text>
            </View>
            <View className="px-3 py-1 rounded-lg bg-[#252526]">
              <Text className="text-[11px] font-outfit text-[#888888]">Summary</Text>
            </View>
            <View className="px-3 py-1 rounded-lg bg-[#252526]">
              <Text className="text-[11px] font-outfit text-[#888888]">Charts</Text>
            </View>
          </View>
        </View>
      );
    }

    // Interactive In-App PowerPoint Presentation View
    if (isPresentation) {
      const slides = [
        {
          title: "Executive Q4 Growth Strategy",
          subtitle: "Market Expansion & Product Architecture Roadmap",
          bullets: [
            "Accelerating enterprise adoption across North America & APAC",
            "Introducing high-performance native document processing pipeline",
            "Targeting 42% Year-over-Year revenue growth in Q4",
          ],
          tag: "OVERVIEW",
          bg: "#C43E1C",
        },
        {
          title: "Key Market Drivers",
          subtitle: "Industry Trends & Competitive Analysis",
          bullets: [
            "Demand for instant, zero-latency document previews on mobile",
            "Migration towards privacy-first, on-device encrypted storage",
            "Seamless cross-platform collaboration tools for team productivity",
          ],
          tag: "ANALYSIS",
          bg: "#B7472A",
        },
        {
          title: "Financial Performance",
          subtitle: "Revenue Distribution & Quarterly Highlights",
          bullets: [
            "ARR reached $14.2M (+38% QoQ expansion)",
            "Net Retention Rate maintained at 124%",
            "Operating margin improved by 450 basis points",
          ],
          tag: "FINANCIALS",
          bg: "#A53A1B",
        },
        {
          title: "Next Steps & Action Items",
          subtitle: "Q1 Execution Timeline",
          bullets: [
            "Finalize v2.0 native mobile framework deployment",
            "Expand developer ecosystem & API integration benchmarks",
            "Initiate global enterprise security audit & compliance certification",
          ],
          tag: "ROADMAP",
          bg: "#8F3116",
        },
      ];

      const slide = slides[presentationSlide] || slides[0];

      return (
        <View className="flex-1 bg-[#121212] rounded-3xl overflow-hidden border border-[#222222] flex-col">
          {/* Top Presentation Bar */}
          <View className="flex-row items-center justify-between px-4 py-3 bg-[#2A1810] border-b border-[#3D2317]">
            <View className="flex-row items-center">
              <Ionicons name="easel" size={18} color="#FF6B4A" style={{ marginRight: 6 }} />
              <Text className="text-[13px] font-outfit-bold text-[#FF8C70]">PowerPoint Presentation View</Text>
            </View>

            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setPresentationSlide((prev) => Math.max(0, prev - 1));
                }}
                disabled={presentationSlide === 0}
                className={`p-1.5 rounded-lg ${presentationSlide === 0 ? "bg-[#222222]" : "bg-[#C43E1C]"}`}
              >
                <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <Text className="text-[12px] font-outfit-bold text-white px-2">
                {presentationSlide + 1} / {slides.length}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setPresentationSlide((prev) => Math.min(slides.length - 1, prev + 1));
                }}
                disabled={presentationSlide === slides.length - 1}
                className={`p-1.5 rounded-lg ${presentationSlide === slides.length - 1 ? "bg-[#222222]" : "bg-[#C43E1C]"}`}
              >
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Presentation Stage Canvas */}
          <View className="flex-1 p-6 bg-[#1A1A1A] items-center justify-center relative">
            <View className="w-full bg-[#242424] rounded-2xl p-6 border border-[#333333] relative overflow-hidden min-h-[280px] justify-between">
              <View
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: slide.bg }}
              />

              <View>
                <View className="flex-row items-center justify-between mb-3 mt-1">
                  <View className="px-2.5 py-0.5 rounded-md" style={{ backgroundColor: `${slide.bg}30` }}>
                    <Text className="text-[10px] font-outfit-bold text-[#FF8C70]">{slide.tag}</Text>
                  </View>
                  <Text className="text-[10px] font-outfit text-[#777777]">{item.name}</Text>
                </View>

                <Text className="text-[22px] font-outfit-bold text-white leading-7 mb-1.5">
                  {slide.title}
                </Text>
                <Text className="text-[13px] font-outfit text-[#FFA085] mb-5">
                  {slide.subtitle}
                </Text>

                <View className="space-y-3">
                  {slide.bullets.map((b, idx) => (
                    <View key={idx} className="flex-row items-start space-x-2">
                      <View className="w-2 h-2 rounded-full bg-[#FF6B4A] mt-1.5 mr-2" />
                      <Text className="flex-1 text-[13px] font-outfit text-[#DDDDDD] leading-5">
                        {b}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-row justify-between items-center pt-4 border-t border-[#333333] mt-6">
                <Text className="text-[10px] font-outfit text-[#666666]">Mark-X Slide Engine</Text>
                <Text className="text-[10px] font-outfit-bold text-[#999999]">Slide {presentationSlide + 1}</Text>
              </View>
            </View>
          </View>

          {/* Slide Thumbnails Selector Bar */}
          <View className="flex-row items-center justify-center p-3 bg-[#1A1A1A] border-t border-[#2A2A2A] space-x-3">
            {slides.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  triggerHaptic();
                  setPresentationSlide(idx);
                }}
                className={`w-14 h-9 rounded-lg border items-center justify-center ${
                  presentationSlide === idx ? "border-[#FF6B4A] bg-[#C43E1C]/20" : "border-[#333333] bg-[#222222]"
                }`}
              >
                <Text className={`text-[11px] font-outfit-bold ${presentationSlide === idx ? "text-[#FF8C70]" : "text-[#777777]"}`}>
                  S{idx + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    // In-App Document Viewer for Web / Office Docs via embedded WebView
    if (item.uri) {
      const isRemote = item.uri.startsWith("http://") || item.uri.startsWith("https://");
      const viewerUrl = isRemote
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(item.uri)}&embedded=true`
        : item.uri;

      return (
        <View className="flex-1 bg-[#121212] overflow-hidden rounded-3xl border border-[#222222] relative">
          <WebView
            source={{ uri: viewerUrl }}
            style={{ flex: 1, backgroundColor: "#121212" }}
            startInLoadingState={true}
            renderLoading={() => (
              <View className="absolute inset-0 bg-[#121212] items-center justify-center z-10">
                <ActivityIndicator size="large" color="#1A73E8" />
                <Text className="text-[14px] font-outfit-bold text-white mt-4">Opening in-app viewer...</Text>
                <Text className="text-[12px] font-outfit text-[#888888] mt-1">{item.name}</Text>
              </View>
            )}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
            onError={() => {
              handleShare();
            }}
          />
        </View>
      );
    }
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

        {/* NATIVE GOOGLE DRIVE HEADER MATCHING REFERENCE UI */}
        <View className="bg-[#1E1F22] border-b border-[#2B2D31] z-10">
          <View className="flex-row items-center justify-between px-4 py-3.5 min-h-[64px]">
            {/* Left: Back Chevron + Document Name */}
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
                {item.name}
              </Text>
            </View>

            {/* Right Action Icons: Search (PDF only), Share, Ellipsis Overflow */}
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
                  onClose();
                  onOptionsPress?.(item);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="p-1 active:opacity-60"
              >
                <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* GOOGLE DRIVE ANIMATED LOADING BLUE LINE */}
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

        {/* MAIN BODY PREVIEW */}
        <View className="flex-1 bg-[#121212]">{renderPreviewBody()}</View>
      </View>
    </Modal>
  );
}

// Backward compatibility alias export
export const DriveFilePreviewModal = DriveFilePreviewScreen;

