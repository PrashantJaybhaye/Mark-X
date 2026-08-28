import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

// Drive Components
import { DriveHeader } from "../../components/drive/DriveHeader";
import { DriveTabs } from "../../components/drive/DriveTabs";
import { DriveEmptyState } from "../../components/drive/DriveEmptyState";
import { DriveActionSheet } from "../../components/drive/DriveActionSheet";
import { UploadStatusToast } from "../../components/drive/UploadStatusToast";

// Services & Helpers
import { DriveFileCategory, getFileCategory } from "../../utils/driveFileTypes";
import { safePickDocument, safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";

export default function DriveScreen() {
  const insets = useSafeAreaInsets();

  // Screen state
  const [activeTab, setActiveTab] = useState<"suggested" | "activity">("suggested");
  const [search, setSearch] = useState("");
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Toast status state
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileCategory, setFileCategory] = useState<DriveFileCategory>("document");
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (name: string, category: DriveFileCategory) => {
    setFileName(name);
    setFileCategory(category);
    setIsToastOpen(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setIsToastOpen(false), 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Action handlers
  const handleUploadFile = async () => {
    const file = await safePickDocument();
    if (file) {
      triggerToast(file.name || "Selected Document", getFileCategory(file.name, file.mimeType));
    }
  };

  const handleScanDocument = async () => {
    const img = await safePickImage();
    if (img) triggerToast("Scanned Document", "pdf");
  };

  const handleImportPhoto = async () => {
    const img = await safePickImage();
    if (img) triggerToast("Imported Image", "image");
  };

  const handleCreateFolder = () => triggerToast("New Folder", "folder");
  const handleCreateNote = () => triggerToast("New Note", "document");

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* 1. Header & Search */}
      <DriveHeader
        search={search}
        onSearchChange={setSearch}
        topInset={insets.top}
      />

      {/* 2. Sub-tabs Switcher */}
      <DriveTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 3. Empty State Scroll Content */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <DriveEmptyState />
      </ScrollView>

      {/* 4. Mark X Squircle Action FAB */}
      <View
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          elevation: 5,
          zIndex: 40,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            triggerHaptic();
            setIsActionSheetOpen(true);
          }}
          className="w-14 h-14 rounded-2xl bg-white items-center justify-center border border-[#E6E8EC] shadow-md shadow-[#0B57D0]/20"
        >
          <Ionicons name="add" size={28} color="#0B57D0" />
        </TouchableOpacity>
      </View>

      {/* 5. Status Notification Toast */}
      <UploadStatusToast
        visible={isToastOpen}
        fileName={fileName}
        category={fileCategory}
        onClose={() => setIsToastOpen(false)}
      />

      {/* 6. Add Action Sheet */}
      <DriveActionSheet
        visible={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onUploadFile={handleUploadFile}
        onScanDocument={handleScanDocument}
        onImportPhoto={handleImportPhoto}
        onCreateFolder={handleCreateFolder}
        onCreateNote={handleCreateNote}
      />
    </View>
  );
}
