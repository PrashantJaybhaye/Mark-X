import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

// Drive Components
import { DriveHeader } from "../../components/drive/DriveHeader";
import { DriveEmptyState } from "../../components/drive/DriveEmptyState";
import { DriveFileList } from "../../components/drive/DriveFileList";
import { DriveActionSheet } from "../../components/drive/DriveActionSheet";
import { DriveFileOptionsSheet } from "../../components/drive/DriveFileOptionsSheet";
import { DriveFilePreviewModal } from "../../components/drive/DriveFilePreviewModal";
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
  const [search, setSearch] = useState("");
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Selected item modal states
  const [selectedFileForOptions, setSelectedFileForOptions] = useState<DriveItem | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<DriveItem | null>(null);

  // Toast status state
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileCategory, setFileCategory] = useState<DriveFileCategory>("document");
  const [toastDetail, setToastDetail] = useState("");
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (name: string, category: DriveFileCategory, detail: string) => {
    setFileName(name);
    setFileCategory(category);
    setToastDetail(detail);
    setIsToastOpen(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setIsToastOpen(false), 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Action handlers - add picked/created files directly into state
  const handleUploadFile = async () => {
    const file = await safePickDocument();
    if (file) {
      const category = getFileCategory(file.name, file.mimeType);
      const newItem: DriveItem = {
        id: generateUniqueId(),
        name: file.name || "Uploaded Document",
        category,
        size: file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
        updatedAt: "Just now",
        uri: file.uri,
        mimeType: file.mimeType,
      };
      setFiles((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, category, "Ready to upload • Saved locally");
    }
  };

  const handleScanDocument = async () => {
    const img = await safePickImage();
    if (img) {
      const name = img.fileName || `Scanned_Doc_${new Date().toISOString().slice(0, 10)}.jpg`;
      const category = getFileCategory(name, img.mimeType);
      const newItem: DriveItem = {
        id: generateUniqueId(),
        name,
        category,
        size: img.fileSize ? `${(img.fileSize / (1024 * 1024)).toFixed(1)} MB` : "1.8 MB",
        updatedAt: "Just now",
        uri: img.uri,
        mimeType: img.mimeType,
      };
      setFiles((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, category, "Image imported • Saved locally");
    }
  };

  const handleImportPhoto = async () => {
    const img = await safePickImage();
    if (img) {
      const newItem: DriveItem = {
        id: generateUniqueId(),
        name: `IMG_${Date.now().toString().slice(-4)}.jpg`,
        category: "image",
        size: "3.2 MB",
        updatedAt: "Just now",
        uri: img.uri,
      };
      setFiles((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, "image", "Photo imported • Saved locally");
    }
  };

  const handleCreateFolder = () => {
    const newFolder: DriveItem = {
      id: generateUniqueId(),
      name: `New Folder ${files.filter((f) => f.isFolder).length + 1}`,
      category: "folder",
      updatedAt: "Just now",
      isFolder: true,
    };
    setFiles((prev) => [newFolder, ...prev]);
    triggerToast(newFolder.name, "folder", "Folder created • Saved locally");
  };

  const handleCreateNote = () => {
    const newNote: DriveItem = {
      id: generateUniqueId(),
      name: `Encrypted Note ${new Date().toLocaleDateString()}.md`,
      category: "document",
      size: "12 KB",
      updatedAt: "Just now",
    };
    setFiles((prev) => [newNote, ...prev]);
    triggerToast(newNote.name, "document", "Note created • Saved locally");
  };

  // Item Options Handlers
  const handleRenameFile = (id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName, updatedAt: "Edited just now" } : f))
    );
    triggerToast(`Renamed to "${newName}"`, "document", "Name updated • Saved locally");
  };

  const handleDeleteFile = (id: string) => {
    const fileToDelete = files.find((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (fileToDelete) {
      triggerToast(`Deleted "${fileToDelete.name}"`, fileToDelete.category, "Removed from Drive");
    }
  };

  const handleShareFile = (item: DriveItem) => {
    triggerToast(`Shared "${item.name}"`, item.category, "Ready to share");
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

      {/* 2. Content Area - Virtualized File List or Empty State */}
      {files.length > 0 ? (
        <DriveFileList
          files={files}
          searchQuery={search}
          contentPaddingBottom={insets.bottom + 80}
          onItemPress={(item) => setSelectedFileForPreview(item)}
          onOptionsPress={(item) => setSelectedFileForOptions(item)}
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

      {/* 3. Mark X Squircle Action FAB */}
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

      {/* 4. Status Notification Toast */}
      <UploadStatusToast
        visible={isToastOpen}
        fileName={fileName}
        category={fileCategory}
        detail={toastDetail}
        onClose={() => setIsToastOpen(false)}
        bottomInset={insets.bottom + 68}
      />

      {/* 5. Add Action Sheet */}
      <DriveActionSheet
        visible={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onUploadFile={handleUploadFile}
        onScanDocument={handleScanDocument}
        onImportPhoto={handleImportPhoto}
        onCreateFolder={handleCreateFolder}
        onCreateNote={handleCreateNote}
      />

      {/* 6. File 3-Dots Options Action Sheet */}
      <DriveFileOptionsSheet
        visible={!!selectedFileForOptions}
        item={selectedFileForOptions}
        onClose={() => setSelectedFileForOptions(null)}
        onDelete={handleDeleteFile}
        onRename={handleRenameFile}
        onShare={handleShareFile}
      />

      {/* 7. File Details & Image Preview Modal */}
      <DriveFilePreviewModal
        visible={!!selectedFileForPreview}
        item={selectedFileForPreview}
        onClose={() => setSelectedFileForPreview(null)}
        onOptionsPress={(item) => {
          setSelectedFileForOptions(item);
        }}
      />
    </View>
  );
}

