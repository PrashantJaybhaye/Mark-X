import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

// Drive Components
import { DriveHeader } from "../../components/drive/DriveHeader";
import { DriveTabs } from "../../components/drive/DriveTabs";
import { DriveEmptyState } from "../../components/drive/DriveEmptyState";
import { DriveFileList } from "../../components/drive/DriveFileList";
import { DriveActionSheet } from "../../components/drive/DriveActionSheet";
import { UploadStatusToast } from "../../components/drive/UploadStatusToast";

// Services & Helpers
import { DriveItem, DriveFileCategory, getFileCategory } from "../../utils/driveFileTypes";
import { safePickDocument, safePickImage } from "../../services/nativePickerService";
import { triggerHaptic } from "../../utils/haptics";

export default function DriveScreen() {
  const insets = useSafeAreaInsets();

  // Files state initialized empty
  const [files, setFiles] = useState<DriveItem[]>([]);

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

  // Action handlers - add picked/created files directly into state
  const handleUploadFile = async () => {
    const file = await safePickDocument();
    if (file) {
      const category = getFileCategory(file.name, file.mimeType);
      const newItem: DriveItem = {
        id: Date.now().toString(),
        name: file.name || "Uploaded Document",
        category,
        size: file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
        updatedAt: "Just now",
        uri: file.uri,
        mimeType: file.mimeType,
      };
      setFiles((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, category);
    }
  };

  const handleScanDocument = async () => {
    const img = await safePickImage();
    if (img) {
      const newItem: DriveItem = {
        id: Date.now().toString(),
        name: `Scanned_Doc_${new Date().toISOString().slice(0, 10)}.pdf`,
        category: "pdf",
        size: "1.8 MB",
        updatedAt: "Just now",
        uri: img.uri,
      };
      setFiles((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, "pdf");
    }
  };

  const handleImportPhoto = async () => {
    const img = await safePickImage();
    if (img) {
      const newItem: DriveItem = {
        id: Date.now().toString(),
        name: `IMG_${Date.now().toString().slice(-4)}.jpg`,
        category: "image",
        size: "3.2 MB",
        updatedAt: "Just now",
        uri: img.uri,
      };
      setFiles((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, "image");
    }
  };

  const handleCreateFolder = () => {
    const newFolder: DriveItem = {
      id: Date.now().toString(),
      name: `New Folder ${files.filter((f) => f.isFolder).length + 1}`,
      category: "folder",
      updatedAt: "Just now",
      isFolder: true,
    };
    setFiles((prev) => [newFolder, ...prev]);
    triggerToast(newFolder.name, "folder");
  };

  const handleCreateNote = () => {
    const newNote: DriveItem = {
      id: Date.now().toString(),
      name: `Encrypted Note ${new Date().toLocaleDateString()}.md`,
      category: "document",
      size: "12 KB",
      updatedAt: "Just now",
    };
    setFiles((prev) => [newNote, ...prev]);
    triggerToast(newNote.name, "document");
  };

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

      {/* 3. Content Area - Virtualized File List or Empty State */}
      {files.length > 0 ? (
        <DriveFileList
          files={files}
          searchQuery={search}
          activeTab={activeTab}
          contentPaddingBottom={insets.bottom + 80}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
        >
          <DriveEmptyState />
        </ScrollView>
      )}

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

