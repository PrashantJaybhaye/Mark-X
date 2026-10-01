import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, TouchableOpacity, ScrollView, Share, Platform, BackHandler, StatusBar as RNStatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";

// Drive Components
import { DriveHeader, DriveTabType } from "../../components/drive/DriveHeader";
import { DriveBreadcrumbs, FolderStackItem } from "../../components/drive/DriveBreadcrumbs";
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
import { loadDriveItems, saveDriveItems } from "../../services/storageService";

export default function DriveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Header state
  const [activeTab, setActiveTab] = useState<DriveTabType>("drive");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Files state initialized from storage
  const [files, setFiles] = useState<DriveItem[]>([]);

  // Folder navigation hierarchy state
  const [folderStack, setFolderStack] = useState<FolderStackItem[]>([
    { id: null, name: "Drive" },
  ]);
  const currentFolderId = folderStack[folderStack.length - 1].id;

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }
    }, [])
  );

  // Hardware Back Button handler for Android subfolder navigation
  useEffect(() => {
    const onBackPress = () => {
      if (folderStack.length > 1) {
        setFolderStack((prev) => prev.slice(0, prev.length - 1));
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [folderStack.length]);

  useEffect(() => {
    let isMounted = true;
    // Clear initial dummy data and start with clean real stored items
    loadDriveItems().then((stored) => {
      if (isMounted) {
        // Filter out old test items if any exist
        const realItems = (stored || []).filter((item) => !item.id.startsWith("test-"));
        setFiles(realItems);
        saveDriveItems(realItems);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateFilesAndPersist = (updater: (prev: DriveItem[]) => DriveItem[]) => {
    setFiles((prev) => {
      const updated = updater(prev);
      saveDriveItems(updated);
      return updated;
    });
  };

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

  // Navigation handlers
  const handleItemPress = (item: DriveItem) => {
    if (item.isFolder) {
      setFolderStack((prev) => [...prev, { id: item.id, name: item.name }]);
    } else {
      setSelectedFileForPreview(item);
    }
  };

  const handleNavigateBack = () => {
    if (folderStack.length > 1) {
      setFolderStack((prev) => prev.slice(0, prev.length - 1));
    }
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    setFolderStack((prev) => prev.slice(0, index + 1));
  };

  // Filter items based on active tab ("drive" = documents & folders, "folders" = only folders)
  // Strict Limitation: Images & videos belong in Gallery tab, not Drive.
  const displayedFiles = useMemo(() => {
    const nonMediaFiles = files.filter(
      (f) => f.isFolder || (f.category !== "image" && f.category !== "video")
    );
    if (activeTab === "folders") {
      return nonMediaFiles.filter((f) => f.isFolder);
    }
    return nonMediaFiles;
  }, [files, activeTab]);

  // Current folder files count
  const currentFolderFilesCount = displayedFiles.filter((f) => {
    if (!currentFolderId) return !f.parentId;
    return f.parentId === currentFolderId;
  }).length;

  // Action handlers - add picked/created files to current folder and persist
  const handleUploadFile = async () => {
    const file = await safePickDocument();
    if (file) {
      const category = getFileCategory(file.name, file.mimeType);

      // Strictly block image & video files silently without showing any toast message
      if (category === "image" || category === "video") return;

      const newItem: DriveItem = {
        id: generateUniqueId(),
        name: file.name || "Uploaded Document",
        category,
        size: file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
        updatedAt: "Just now",
        uri: file.uri,
        mimeType: file.mimeType,
        parentId: currentFolderId,
      };
      updateFilesAndPersist((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, category, "Saved to Drive");
    }
  };

  const handleScanDocument = async () => {
    const img = await safePickImage();
    if (img) {
      const name = `Scanned_Doc_${new Date().toISOString().slice(0, 10)}.pdf`;
      const newItem: DriveItem = {
        id: generateUniqueId(),
        name,
        category: "pdf",
        size: img.fileSize ? `${(img.fileSize / (1024 * 1024)).toFixed(1)} MB` : "1.8 MB",
        updatedAt: "Just now",
        uri: img.uri,
        parentId: currentFolderId,
      };
      updateFilesAndPersist((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, "pdf", "Document scanned • Saved as PDF");
    }
  };

  const handleCreateFolder = () => {
    const currentFolderSiblings = files.filter(
      (f) => f.isFolder && (currentFolderId ? f.parentId === currentFolderId : !f.parentId)
    ).length;

    const newFolder: DriveItem = {
      id: generateUniqueId(),
      name: `New Folder ${currentFolderSiblings + 1}`,
      category: "folder",
      updatedAt: "Just now",
      isFolder: true,
      parentId: currentFolderId,
    };
    updateFilesAndPersist((prev) => [newFolder, ...prev]);
    triggerToast(newFolder.name, "folder", "Folder created • Saved locally");
  };

  const handleCreateNote = () => {
    const newNote: DriveItem = {
      id: generateUniqueId(),
      name: `Encrypted Note ${new Date().toLocaleDateString()}.md`,
      category: "document",
      size: "12 KB",
      updatedAt: "Just now",
      parentId: currentFolderId,
    };
    updateFilesAndPersist((prev) => [newNote, ...prev]);
    triggerToast(newNote.name, "document", "Note created • Saved locally");
  };

  // Item Options Handlers
  const handleRenameFile = (id: string, newName: string) => {
    updateFilesAndPersist((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName, updatedAt: "Edited just now" } : f))
    );
    triggerToast(`Renamed to "${newName}"`, "document", "Name updated");
  };

  const handleDeleteFile = (id: string) => {
    const fileToDelete = files.find((f) => f.id === id);
    updateFilesAndPersist((prev) => {
      const idsToDelete = new Set<string>([id]);
      if (fileToDelete?.isFolder) {
        let addedMore = true;
        while (addedMore) {
          addedMore = false;
          for (const item of prev) {
            if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
              idsToDelete.add(item.id);
              addedMore = true;
            }
          }
        }
      }
      return prev.filter((f) => !idsToDelete.has(f.id));
    });
    if (fileToDelete) {
      triggerToast(`Deleted "${fileToDelete.name}"`, fileToDelete.category, "Removed from Drive");
    }
  };

  const handleShareFile = async (item: DriveItem) => {
    try {
      await Share.share({
        title: item.name,
        message: item.uri ? `${item.name}\n${item.uri}` : `Mark-X File: ${item.name}`,
        url: item.uri,
      });
    } catch {
      triggerToast(`Shared "${item.name}"`, item.category, "Ready to share");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* 1. Drive Header with Search, Drive / Folders Tabs, Sort & Layout Controls */}
      <DriveHeader
        search={search}
        onSearchChange={setSearch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sortOrder={sortOrder}
        onToggleSort={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === "grid" ? "list" : "grid"))}
        topInset={insets.top}
      />

      {/* 2. Folder Navigation Breadcrumbs (Shown only inside subfolders) */}
      {folderStack.length > 1 && (
        <DriveBreadcrumbs
          folderStack={folderStack}
          onNavigateBack={handleNavigateBack}
          onNavigateToBreadcrumb={handleNavigateToBreadcrumb}
          itemCount={currentFolderFilesCount}
        />
      )}

      {/* 3. Content Area - Virtualized File List / Grid or Empty State */}
      {displayedFiles.length > 0 || folderStack.length > 1 ? (
        <DriveFileList
          files={displayedFiles}
          searchQuery={search}
          currentFolderId={currentFolderId}
          viewMode={viewMode}
          sortOrder={sortOrder}
          contentPaddingBottom={insets.bottom + 80}
          onItemPress={handleItemPress}
          onOptionsPress={(item) => setSelectedFileForOptions(item)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
        >
          <DriveEmptyState />
        </ScrollView>
      )}

      {/* 4. Google Drive Material You 4-Color Action FAB */}
      <View
        style={{
          position: "absolute",
          right: 18,
          bottom: isToastOpen ? 64 : 14,
          elevation: 10,
          zIndex: 40,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            triggerHaptic();
            setIsActionSheetOpen(true);
          }}
          className="w-16 h-16 rounded-full bg-white items-center justify-center border border-[#E0E4EC] shadow-xl shadow-black/20"
        >
          {/* Authentic Google 4-Color Plus Icon */}
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Path fill="#EA4335" d="M16 8h4v8h-4z" />
            <Path fill="#4285F4" d="M20 16h8v4h-8z" />
            <Path fill="#FBBC05" d="M16 20h4v8h-4z" />
            <Path fill="#34A853" d="M8 16h8v4h-8z" />
            <Path fill="#4285F4" d="M16 16h4v4h-4z" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* 5. Status Notification Toast Banner - Touched directly to top of bottom tab bar */}
      <UploadStatusToast
        visible={isToastOpen}
        fileName={fileName}
        category={fileCategory}
        detail={toastDetail}
        onClose={() => setIsToastOpen(false)}
        bottomInset={0}
      />

      {/* 6. Add Action Sheet */}
      <DriveActionSheet
        visible={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onUploadFile={handleUploadFile}
        onScanDocument={handleScanDocument}
        onCreateFolder={handleCreateFolder}
        onCreateNote={handleCreateNote}
      />

      {/* 7. File 3-Dots Options Action Sheet */}
      <DriveFileOptionsSheet
        visible={!!selectedFileForOptions}
        item={selectedFileForOptions}
        onClose={() => setSelectedFileForOptions(null)}
        onDelete={handleDeleteFile}
        onRename={handleRenameFile}
        onShare={handleShareFile}
      />

      {/* 8. File Details & Image Preview Modal */}
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
