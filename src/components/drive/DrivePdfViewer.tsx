import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
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
import { openInNativeApp } from "../../services/nativeFileOpenerService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DrivePdfViewerProps {
  item: DriveItem;
  onLoadingChange?: (loading: boolean) => void;
  showJumpModal?: boolean;
  onCloseJumpModal?: () => void;
  onRequestClose?: () => void;
}

export function DrivePdfViewer({
  item,
  onLoadingChange,
  showJumpModal,
  onCloseJumpModal,
  onRequestClose,
}: DrivePdfViewerProps) {
  const pdfRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const hasTriggeredFallbackRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [jumpPageInput, setJumpPageInput] = useState<string>("");

  const fallbackToNative = useCallback(async () => {
    if (hasTriggeredFallbackRef.current) return;
    hasTriggeredFallbackRef.current = true;
    if (isMountedRef.current) {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
    onRequestClose?.();
    await openInNativeApp(item);
  }, [item, onLoadingChange, onRequestClose]);

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

  useEffect(() => {
    if (!item?.uri) {
      fallbackToNative();
    }
  }, [item?.uri, fallbackToNative]);

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
      {item.uri ? (
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
            console.warn("[DrivePdfViewer] Native PDF error, opening in native app:", error);
            fallbackToNative();
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
      ) : null}

      {isLoading && (
        <View className="absolute inset-0 bg-white/70 items-center justify-center z-20">
          <ActivityIndicator size="large" color="#1A73E8" />
        </View>
      )}

      <Modal
        visible={!!showJumpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => onCloseJumpModal?.()}
      >
        <View className="flex-1 bg-black/45 items-center justify-center px-6">
          <View className="w-full bg-white rounded-3xl p-5 border border-[#E8EAED] shadow-xl items-center">
            <View className="w-12 h-12 rounded-2xl bg-[#E8F0FE] items-center justify-center mb-3">
              <Ionicons name="navigate-outline" size={24} color="#1A73E8" />
            </View>

            <Text className="text-[17px] font-outfit-bold text-[#1F1F1F]">Go to Page</Text>
            <Text className="text-[13px] font-outfit text-[#5F6368] mt-1 mb-4">
              Enter page number between 1 and {totalPages || 1}
            </Text>

            <TextInput
              keyboardType="number-pad"
              value={jumpPageInput}
              onChangeText={setJumpPageInput}
              autoFocus={true}
              selectTextOnFocus={true}
              placeholderTextColor="#9AA0A6"
              className="w-full bg-[#F1F3F4] text-[#1F1F1F] font-outfit-bold text-[20px] text-center py-2.5 rounded-2xl border border-[#E0E0E0] mb-5"
            />

            <View className="flex-row w-full space-x-3">
              <TouchableOpacity
                onPress={() => onCloseJumpModal?.()}
                className="flex-1 py-3 rounded-full bg-[#F1F3F4] items-center"
              >
                <Text className="text-[14px] font-outfit-semibold text-[#444746]">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExecuteJump}
                className="flex-1 py-3 rounded-full bg-[#1A73E8] items-center shadow-xs"
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
