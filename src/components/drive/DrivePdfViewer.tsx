import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Dimensions,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Pdf from "react-native-pdf";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import { DriveItem } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DrivePdfViewerProps {
  item: DriveItem;
  onLoadingChange?: (loading: boolean) => void;
  showJumpModal?: boolean;
  onCloseJumpModal?: () => void;
}

export function DrivePdfViewer({
  item,
  onLoadingChange,
  showJumpModal,
  onCloseJumpModal,
}: DrivePdfViewerProps) {
  const pdfRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [jumpPageInput, setJumpPageInput] = useState<string>("");

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMountedRef.current) {
      onLoadingChange?.(isLoading);
    }
  }, [isLoading, onLoadingChange]);

  const handleShare = useCallback(async () => {
    triggerHaptic();
    try {
      if (item.uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(item.uri, {
          mimeType: "application/pdf",
          dialogTitle: item.name,
        });
      } else if (item.uri) {
        await Share.share({ title: item.name, message: item.name, url: item.uri });
      }
    } catch (e) {
      console.warn("Share error:", e);
    }
  }, [item]);

  const handleOpenExternalFallback = useCallback(async () => {
    triggerHaptic();
    if (!item.uri) return;

    try {
      if (item.uri.startsWith("http://") || item.uri.startsWith("https://")) {
        await WebBrowser.openBrowserAsync(item.uri);
      } else {
        await handleShare();
      }
    } catch (e) {
      console.warn("Fallback open error:", e);
      await handleShare();
    }
  }, [item, handleShare]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && pdfRef.current) {
      triggerHaptic();
      pdfRef.current.setPage(page);
    }
  };

  const handleExecuteJump = () => {
    const pageNum = parseInt(jumpPageInput.trim(), 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum);
      onCloseJumpModal?.();
      setJumpPageInput("");
    }
  };

  const pdfSource = item.uri
    ? { uri: item.uri, cache: true }
    : { uri: "", cache: true };

  return (
    <View className="flex-1 bg-[#121212] relative">
      {hasError ? (
        <View className="flex-1 items-center justify-center p-6 bg-[#121212]">
          <View className="w-16 h-16 rounded-full bg-[#3D0A0E] border border-[#7F1D1D] items-center justify-center mb-4">
            <Ionicons name="document-text" size={36} color="#FF4D4D" />
          </View>
          <Text className="text-[17px] font-outfit-bold text-white">Unable to render PDF</Text>
          <Text className="text-[13px] font-outfit text-[#888888] text-center mt-1.5 mb-6 px-4">
            {errorMessage || "The native document rendering engine encountered an issue displaying this file."}
          </Text>
          <TouchableOpacity
            onPress={handleOpenExternalFallback}
            className="px-6 py-3 rounded-2xl bg-[#1A73E8] flex-row items-center"
          >
            <Ionicons name="open-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text className="text-[14px] font-outfit-semibold text-white">
              {item.uri?.startsWith("http") ? "Open with Web Viewer" : "Open in External App"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Pdf
          ref={pdfRef}
          trustAllCerts={false}
          source={pdfSource}
          fitPolicy={0}
          onLoadComplete={(numberOfPages) => {
            if (isMountedRef.current) {
              setIsLoading(false);
              setTotalPages(numberOfPages);
            }
          }}
          onPageChanged={(page) => {
            if (isMountedRef.current) {
              setCurrentPage(page);
            }
          }}
          onError={(error) => {
            console.warn("Native PDF error:", error);
            if (isMountedRef.current) {
              setIsLoading(false);
              setHasError(true);
              setErrorMessage(error.message || "Native PDF error");
            }
          }}
          onPressLink={(uri) => {
            if (uri && (uri.startsWith("http://") || uri.startsWith("https://"))) {
              WebBrowser.openBrowserAsync(uri).catch(() => {});
            } else if (uri) {
              Sharing.shareAsync(uri, { mimeType: "application/pdf" }).catch(() => {});
            }
          }}
          style={styles.pdfView}
        />
      )}

      {/* LOADING OVERLAY */}
      {isLoading && !hasError && (
        <View className="absolute inset-0 bg-[#121212]/90 items-center justify-center z-20">
          <View className="bg-[#1E1F22] px-6 py-5 rounded-3xl items-center border border-[#2B2D31]">
            <ActivityIndicator size="large" color="#1A73E8" />
            <Text className="text-[14px] font-outfit-bold text-white mt-4">Opening PDF</Text>
            <Text className="text-[12px] font-outfit text-[#888888] mt-1">
              {item.size || "Preparing pages..."}
            </Text>
          </View>
        </View>
      )}

      {/* PAGE JUMP MODAL */}
      <Modal
        visible={!!showJumpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => onCloseJumpModal?.()}
      >
        <View className="flex-1 bg-black/75 items-center justify-center px-6">
          <View className="w-full bg-[#1E1F22] rounded-3xl p-5 border border-[#2B2D31] items-center">
            <View className="w-12 h-12 rounded-2xl bg-[#1A73E8]/20 items-center justify-center mb-3">
              <Ionicons name="navigate-outline" size={24} color="#1A73E8" />
            </View>

            <Text className="text-[17px] font-outfit-bold text-white">Go to Page</Text>
            <Text className="text-[13px] font-outfit text-[#888888] mt-1 mb-4">
              Enter page number between 1 and {totalPages || 1}
            </Text>

            <TextInput
              keyboardType="number-pad"
              value={jumpPageInput}
              onChangeText={setJumpPageInput}
              autoFocus={true}
              selectTextOnFocus={true}
              placeholderTextColor="#888888"
              className="w-full bg-[#121212] text-white font-outfit-bold text-[20px] text-center py-2.5 rounded-2xl border border-[#2B2D31] mb-5"
            />

            <View className="flex-row w-full space-x-3">
              <TouchableOpacity
                onPress={() => onCloseJumpModal?.()}
                className="flex-1 py-3 rounded-2xl bg-[#2B2D31] items-center"
              >
                <Text className="text-[14px] font-outfit-semibold text-[#888888]">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExecuteJump}
                className="flex-1 py-3 rounded-2xl bg-[#1A73E8] items-center"
              >
                <Text className="text-[14px] font-outfit-semibold text-white">Jump</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pdfView: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: "#121212",
  },
});