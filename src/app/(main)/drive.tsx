import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, TouchableOpacity, ScrollView, Share, Platform, BackHandler, StatusBar as RNStatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";

import * as FileSystem from "expo-file-system/legacy";

import { DriveHeader, DriveTabType } from "../../components/drive/DriveHeader";
import { DriveBreadcrumbs, FolderStackItem } from "../../components/drive/DriveBreadcrumbs";
import { DriveEmptyState } from "../../components/drive/DriveEmptyState";
import { DriveFileList } from "../../components/drive/DriveFileList";
import { DriveActionSheet } from "../../components/drive/DriveActionSheet";
import { DriveFileOptionsSheet } from "../../components/drive/DriveFileOptionsSheet";
import { DriveFilePreviewScreen } from "../../components/drive/DriveFilePreviewScreen";
import { UploadStatusToast } from "../../components/drive/UploadStatusToast";

import { DriveItem, DriveFileCategory, getFileCategory } from "../../utils/driveFileTypes";
import { safePickDocument, safePickImage } from "../../services/nativePickerService";
import { openInNativeApp } from "../../services/nativeFileOpenerService";
import { triggerHaptic } from "../../utils/haptics";
import { loadDriveItems, saveDriveItems } from "../../services/storageService";
import {
  fetchDriveItemsFromServer,
  saveDriveItemToServer,
  deleteDriveItemFromServer,
  subscribeToDriveServer,
  uploadDriveFileToCloudflare,
  exportDriveFile,
  toggleDriveItemStarInServer,
} from "../../services/driveFirebaseService";

export default function DriveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<DriveTabType>("drive");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [files, setFiles] = useState<DriveItem[]>([]);

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

    loadDriveItems().then((stored) => {
      if (isMounted) {
        const realItems = (stored || []).filter((item) => !item.id.startsWith("test-"));
        setFiles(realItems);
      }
    });

    fetchDriveItemsFromServer().then((serverItems) => {
      if (isMounted && serverItems && serverItems.length > 0) {
        setFiles(serverItems);
      }
    });

    const unsubscribe = subscribeToDriveServer((updatedItems) => {
      if (isMounted && updatedItems) {
        setFiles(updatedItems);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const updateFilesAndPersist = (updater: (prev: DriveItem[]) => DriveItem[]) => {
    setFiles((prev) => {
      const updated = updater(prev);
      saveDriveItems(updated);
      return updated;
    });
  };

  const [search, setSearch] = useState("");
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const [selectedFileForOptions, setSelectedFileForOptions] = useState<DriveItem | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<DriveItem | null>(null);

  const [isToastOpen, setIsToastOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [toastDetail, setToastDetail] = useState("");
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (name: string, _category: any, detail: string) => {
    setFileName(name);
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

  const handleItemPress = (item: DriveItem) => {
    if (item.isFolder) {
      setFolderStack((prev) => [...prev, { id: item.id, name: item.name }]);
      return;
    }

    const isPdf = item.category === "pdf" || item.name.toLowerCase().endsWith(".pdf");
    const isImage = item.category === "image";

    if (isPdf || isImage) {
      setSelectedFileForPreview(item);
    } else {
      openInNativeApp(item);
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

  const displayedFiles = useMemo(() => {
    const nonMediaFiles = files.filter(
      (f) => f.isFolder || (f.category !== "image" && f.category !== "video")
    );
    if (activeTab === "folders") {
      return nonMediaFiles.filter((f) => f.isFolder);
    }
    return nonMediaFiles;
  }, [files, activeTab]);

  const currentFolderFilesCount = displayedFiles.filter((f) => {
    if (!currentFolderId) return !f.parentId;
    return f.parentId === currentFolderId;
  }).length;

  const handleUploadFile = async () => {
    const file = await safePickDocument();
    if (file) {
      const category = getFileCategory(file.name, file.mimeType);

      if (category === "image" || category === "video") return;

      let permanentUri = file.uri;
      if (FileSystem.documentDirectory && file.uri.startsWith("file://")) {
        try {
          const safeName = `drive_${Date.now()}_${(file.name || "document").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const destUri = `${FileSystem.documentDirectory}${safeName}`;
          await FileSystem.copyAsync({ from: file.uri, to: destUri });
          permanentUri = destUri;
        } catch (copyErr) {
          console.warn("[Drive] Failed to copy to permanent storage, using original uri:", copyErr);
        }
      }

      const newItem: DriveItem = {
        id: generateUniqueId(),
        name: file.name || "Uploaded Document",
        category,
        size: file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
        updatedAt: String(Date.now()),
        uri: permanentUri,
        mimeType: file.mimeType,
        parentId: currentFolderId,
        createdAt: Date.now(),
        uploading: true,
      };

      updateFilesAndPersist((prev) => [newItem, ...prev]);
      triggerToast(newItem.name, category, "Uploading to Cloud Storage...");

      saveDriveItemToServer(newItem).catch((err) =>
        console.warn("[Drive] Firebase metadata write error:", err)
      );

      uploadDriveFileToCloudflare(newItem)
        .then((cfRes) => {
          if (cfRes.success && cfRes.url) {
            updateFilesAndPersist((prev) =>
              prev.map((f) =>
                f.id === newItem.id
                  ? { ...f, cloudflareUrl: cfRes.url, cloudflareKey: cfRes.key, uploading: false }
                  : f
              )
            );
            triggerToast(newItem.name, category, "Saved to Cloud Storage");
          } else {
            console.warn("[Drive] Cloudflare upload error:", cfRes.error);
            updateFilesAndPersist((prev) =>
              prev.map((f) => (f.id === newItem.id ? { ...f, uploading: false } : f))
            );
            triggerToast(newItem.name, category, "Saved locally");
          }
        })
        .catch((err) => {
          console.warn("[Drive] Cloudflare upload error:", err);
          updateFilesAndPersist((prev) =>
            prev.map((f) => (f.id === newItem.id ? { ...f, uploading: false } : f))
          );
        });
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
      updatedAt: String(Date.now()),
      isFolder: true,
      parentId: currentFolderId,
      createdAt: Date.now(),
    };

    updateFilesAndPersist((prev) => [newFolder, ...prev]);
    saveDriveItemToServer(newFolder).catch((err) =>
      console.warn("[Drive] Firebase folder creation error:", err)
    );
    triggerToast(newFolder.name, "folder", "Folder created");
  };

  const handleToggleStar = (item: DriveItem) => {
    const nextStarred = !item.starred;
    updateFilesAndPersist((prev) =>
      prev.map((f) =>
        f.id === item.id ? { ...f, starred: nextStarred, updatedAt: String(Date.now()) } : f
      )
    );
    toggleDriveItemStarInServer(item.id, nextStarred).catch((err) =>
      console.warn("[Drive] Toggle star server error:", err)
    );
    triggerToast(
      item.name,
      item.category,
      nextStarred ? "Added to Starred" : "Removed from Starred"
    );
  };

  const handleRenameFile = (id: string, newName: string) => {
    updateFilesAndPersist((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const updated = { ...f, name: newName, updatedAt: String(Date.now()) };
          saveDriveItemToServer(updated).catch((err) =>
            console.warn("[Drive] Firebase rename sync error:", err)
          );
          return updated;
        }
        return f;
      })
    );
    triggerToast(`Renamed to "${newName}"`, "document", "Name updated & synced");
  };

  const handleDeleteFile = (id: string) => {
    const fileToDelete = files.find((f) => f.id === id);

    deleteDriveItemFromServer(id, files).catch((err) =>
      console.warn("[Drive] Firebase delete error:", err)
    );

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
      triggerToast(`Deleted "${fileToDelete.name}"`, fileToDelete.category, "Removed from Drive & Cloud");
    }
  };

  const handleShareFile = async (item: DriveItem) => {
    if (item.isFolder) {
      triggerToast("Cannot Export", "folder", "Folders cannot be exported as a single file");
      return;
    }
    triggerToast(`Exporting "${item.name}"...`, item.category, "Preparing file attachment");
    const result = await exportDriveFile(item);
    if (!result.success && result.error) {
      triggerToast("Export Failed", item.category, result.error);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {}
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

      {}
      {folderStack.length > 1 && (
        <DriveBreadcrumbs
          folderStack={folderStack}
          onNavigateBack={handleNavigateBack}
          onNavigateToBreadcrumb={handleNavigateToBreadcrumb}
          itemCount={currentFolderFilesCount}
        />
      )}

      {}
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

      {}
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
          {}
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Path fill="#EA4335" d="M16 8h4v8h-4z" />
            <Path fill="#4285F4" d="M20 16h8v4h-8z" />
            <Path fill="#FBBC05" d="M16 20h4v8h-4z" />
            <Path fill="#34A853" d="M8 16h8v4h-8z" />
            <Path fill="#4285F4" d="M16 16h4v4h-4z" />
          </Svg>
        </TouchableOpacity>
      </View>

      {}
      <UploadStatusToast
        visible={isToastOpen}
        fileName={fileName}
        detail={toastDetail}
        onClose={() => setIsToastOpen(false)}
        bottomInset={0}
      />

      {}
      <DriveActionSheet
        visible={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onUploadFile={handleUploadFile}
        onCreateFolder={handleCreateFolder}
      />

      {}
      <DriveFileOptionsSheet
        visible={!!selectedFileForOptions}
        item={selectedFileForOptions}
        allItems={files}
        onClose={() => setSelectedFileForOptions(null)}
        onDelete={handleDeleteFile}
        onRename={handleRenameFile}
        onShare={handleShareFile}
        onToggleStar={handleToggleStar}
      />

      {}
      <DriveFilePreviewScreen
        visible={!!selectedFileForPreview}
        item={selectedFileForPreview}
        allItems={files}
        onClose={() => setSelectedFileForPreview(null)}
        onDelete={handleDeleteFile}
        onRename={handleRenameFile}
        onToggleStar={handleToggleStar}
      />
    </View>
  );
}
