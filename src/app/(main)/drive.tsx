import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Platform,
  StatusBar as RNStatusBar,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import * as FileSystem from "expo-file-system/legacy";

import { DriveActionSheet } from "../../components/drive/DriveActionSheet";
import { DriveBreadcrumbs, FolderStackItem } from "../../components/drive/DriveBreadcrumbs";
import { DriveCreateFolderDialog } from "../../components/drive/DriveCreateFolderDialog";
import { DriveEmptyState } from "../../components/drive/DriveEmptyState";
import { DriveFileList } from "../../components/drive/DriveFileList";
import { DriveFileOptionsSheet } from "../../components/drive/DriveFileOptionsSheet";
import { DriveFilePreviewScreen } from "../../components/drive/DriveFilePreviewScreen";
import { DriveMoveModal } from "../../components/drive/DriveMoveModal";
import { DriveHeader } from "../../components/drive/DriveHeader";
import { ToastStatusType, UploadStatusToast } from "../../components/drive/UploadStatusToast";

import {
  deleteDriveItemFromServer,
  exportDriveFile,
  fetchDriveItemsFromServer,
  saveDriveItemToServer,
  subscribeToDriveServer,
  toggleDriveItemStarInServer,
  uploadDriveFileToCloudflare,
} from "../../services/driveFirebaseService";
import { openInNativeApp } from "../../services/nativeFileOpenerService";
import { safePickDocument } from "../../services/nativePickerService";
import { loadDriveItems, saveDriveItems } from "../../services/storageService";
import { DriveItem, formatBytes, getFileCategory, getFileDisplayName } from "../../utils/driveFileTypes";
import { triggerHaptic } from "../../utils/haptics";
import { subscribeDriveToast } from "../../services/driveToastService";

export default function DriveScreen() {
  const insets = useSafeAreaInsets();

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [folderStack, setFolderStack] = useState<FolderStackItem[]>([
    { id: null, name: "Drive" },
  ]);
  const currentFolderId = folderStack[folderStack.length - 1].id;

  const [search, setSearch] = useState("");
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [selectedFileForOptions, setSelectedFileForOptions] = useState<DriveItem | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<DriveItem | null>(null);
  const [selectedFileForMove, setSelectedFileForMove] = useState<DriveItem | null>(null);

  const [isToastOpen, setIsToastOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [toastDetail, setToastDetail] = useState("");
  const [toastType, setToastType] = useState<ToastStatusType>("success");
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fabBottomAnim = useRef(new Animated.Value(14)).current;
  const params = useLocalSearchParams<{ toastFileName?: string; toastDetail?: string }>();

  useEffect(() => {
    if (params.toastFileName) {
      triggerToast(params.toastFileName, "uploading", params.toastDetail || "Uploading to Cloud Storage...");
    }
  }, [params.toastFileName, params.toastDetail]);

  useEffect(() => {
    const unsubscribe = subscribeDriveToast((name, type, detail) => {
      triggerToast(name, type, detail);
    });
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }
      loadDriveItems().then((stored) => {
        const realItems = (stored || []).filter((item) => !item.id.startsWith("test-"));
        setFiles(realItems);
      });
      if (params.toastFileName) {
        triggerToast(params.toastFileName, "uploading", params.toastDetail || "Uploading to Cloud Storage...");
      }
    }, [params.toastFileName, params.toastDetail])
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

  useEffect(() => {
    Animated.spring(fabBottomAnim, {
      toValue: isToastOpen ? 68 : 14,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [isToastOpen, fabBottomAnim]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const updateFilesAndPersist = (updater: (prev: DriveItem[]) => DriveItem[]) => {
    setFiles((prev) => {
      const updated = updater(prev);
      saveDriveItems(updated);
      return updated;
    });
  };

  const triggerToast = (
    name: string,
    type: ToastStatusType = "success",
    detail: string = ""
  ) => {
    setFileName(name);
    setToastDetail(detail);
    setToastType(type);
    setIsToastOpen(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setIsToastOpen(false), 3500);
  };

  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const handleItemPress = (item: DriveItem) => {
    if (item.isFolder) {
      setFolderStack((prev) => [...prev, { id: item.id, name: item.name }]);
      return;
    }

    const name = (item.name || "").toLowerCase();
    const isPdf = item.category === "pdf" || name.endsWith(".pdf");
    const isImage = item.category === "image";
    const isTextOrCode =
      item.category === "code" ||
      item.category === "document" ||
      /\.(txt|md|json|csv|html|htm|xml|css|js|ts|tsx|jsx|py|log|docx|doc|rtf)$/i.test(name);

    if (isPdf || isImage || isTextOrCode) {
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
    return files.filter(
      (f) => f.isFolder || (f.category !== "image" && f.category !== "video")
    );
  }, [files]);

  const currentFolderFilesCount = displayedFiles.filter((f) => {
    if (!currentFolderId) return !f.parentId;
    return f.parentId === currentFolderId;
  }).length;

  const handleUploadFile = async () => {
    const file = await safePickDocument();
    if (!file) return;

    const category = getFileCategory(file.name, file.mimeType);
    if (category === "image" || category === "video") {
      triggerToast("Photos & Videos", "error", "Please switch to the Gallery tab to upload photos and videos.");
      return;
    }

    let permanentUri = file.uri;
    if (FileSystem.documentDirectory && (file.uri.startsWith("file://") || file.uri.startsWith("content://"))) {
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
      size: formatBytes(file.size) || "1.2 MB",
      updatedAt: String(Date.now()),
      uri: permanentUri,
      mimeType: file.mimeType,
      parentId: currentFolderId,
      createdAt: Date.now(),
      uploading: true,
    };

    updateFilesAndPersist((prev) => [newItem, ...prev]);
    triggerToast(getFileDisplayName(newItem.name, newItem.isFolder), "uploading", "Uploading to Cloud Storage...");

    saveDriveItemToServer(newItem).catch((err) =>
      console.warn("[Drive] Firebase metadata write error:", err)
    );

    try {
      const cfRes = await uploadDriveFileToCloudflare(newItem);
      if (cfRes.success && cfRes.url) {
        updateFilesAndPersist((prev) =>
          prev.map((f) =>
            f.id === newItem.id
              ? { ...f, cloudflareUrl: cfRes.url, cloudflareKey: cfRes.key, uploading: false }
              : f
          )
        );
        triggerToast(getFileDisplayName(newItem.name, newItem.isFolder), "success", "Saved to Cloud Storage");
      } else {
        updateFilesAndPersist((prev) =>
          prev.map((f) => (f.id === newItem.id ? { ...f, uploading: false } : f))
        );
        triggerToast(getFileDisplayName(newItem.name, newItem.isFolder), "success", "Saved locally");
      }
    } catch (err) {
      console.warn("[Drive] Cloudflare upload error:", err);
      updateFilesAndPersist((prev) =>
        prev.map((f) => (f.id === newItem.id ? { ...f, uploading: false } : f))
      );
    }
  };

  const handleConfirmCreateFolder = (folderName: string) => {
    const baseName = folderName.trim() || "Untitled folder";

    const existingNames = new Set(
      files
        .filter((f) => f.isFolder && (f.parentId ?? null) === (currentFolderId ?? null))
        .map((f) => f.name.toLowerCase())
    );

    let finalName = baseName;
    let counter = 1;
    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `${baseName} (${counter})`;
      counter++;
    }

    const newFolder: DriveItem = {
      id: generateUniqueId(),
      name: finalName,
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
      getFileDisplayName(item.name, item.isFolder),
      "star",
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
    triggerToast(`Renamed to "${getFileDisplayName(newName, false)}"`, "rename", "Name updated & synced");
  };

  const handleDeleteFile = (id: string) => {
    const fileToDelete = files.find((f) => f.id === id);

    deleteDriveItemFromServer(id, files).catch((err) =>
      console.warn("[Drive] Firebase delete error:", err)
    );

    const idsToDelete = new Set<string>([id]);
    if (fileToDelete?.isFolder) {
      let addedMore = true;
      while (addedMore) {
        addedMore = false;
        for (const item of files) {
          if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
            idsToDelete.add(item.id);
            addedMore = true;
          }
        }
      }

      setFolderStack((prev) => {
        const deletedIdx = prev.findIndex((f) => f.id && idsToDelete.has(f.id));
        if (deletedIdx > 0) return prev.slice(0, deletedIdx);
        if (deletedIdx === 0) return [{ id: null, name: "Drive" }];
        return prev;
      });
    }

    updateFilesAndPersist((prev) => prev.filter((f) => !idsToDelete.has(f.id)));
    if (fileToDelete) {
      triggerToast(`Deleted "${getFileDisplayName(fileToDelete.name, fileToDelete.isFolder)}"`, "delete", "Removed from Drive & Cloud");
    }
  };

  const handleMoveFile = (itemId: string, targetFolderId: string | null) => {
    const file = files.find((f) => f.id === itemId);
    if (!file) return;

    const targetFolderName = targetFolderId
      ? files.find((f) => f.id === targetFolderId)?.name || "Folder"
      : "Drive";

    const updated = {
      ...file,
      parentId: targetFolderId,
      updatedAt: String(Date.now()),
    };

    updateFilesAndPersist((prev) =>
      prev.map((f) => (f.id === itemId ? updated : f))
    );

    saveDriveItemToServer(updated).catch((err) =>
      console.warn("[Drive] Firebase move error:", err)
    );

    triggerToast(
      `Moved to "${targetFolderName}"`,
      "folder",
      `"${getFileDisplayName(file.name, file.isFolder)}" moved successfully`
    );
  };

  const handleShareFile = async (item: DriveItem) => {
    if (item.isFolder) {
      triggerToast("Cannot Export", "error", "Folders cannot be exported as a single file");
      return;
    }
    triggerToast(`Exporting "${getFileDisplayName(item.name, item.isFolder)}"...`, "export", "Preparing file attachment");
    const result = await exportDriveFile(item);
    if (!result.success && result.error) {
      triggerToast("Export Failed", "error", result.error);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <DriveHeader
        search={search}
        onSearchChange={setSearch}
        sortOrder={sortOrder}
        onToggleSort={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === "grid" ? "list" : "grid"))}
        topInset={insets.top}
      />

      {folderStack.length > 1 && (
        <DriveBreadcrumbs
          folderStack={folderStack}
          onNavigateBack={handleNavigateBack}
          onNavigateToBreadcrumb={handleNavigateToBreadcrumb}
          itemCount={currentFolderFilesCount}
        />
      )}

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

      <Animated.View
        style={{
          position: "absolute",
          right: 18,
          bottom: fabBottomAnim,
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
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Path fill="#EA4335" d="M16 8h4v8h-4z" />
            <Path fill="#4285F4" d="M20 16h8v4h-8z" />
            <Path fill="#FBBC05" d="M16 20h4v8h-4z" />
            <Path fill="#34A853" d="M8 16h8v4h-8z" />
            <Path fill="#4285F4" d="M16 16h4v4h-4z" />
          </Svg>
        </TouchableOpacity>
      </Animated.View>

      <UploadStatusToast
        visible={isToastOpen}
        fileName={fileName}
        detail={toastDetail}
        type={toastType}
        onClose={() => setIsToastOpen(false)}
        bottomInset={0}
      />

      <DriveActionSheet
        visible={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onUploadFile={handleUploadFile}
        onCreateFolder={() => {
          setIsActionSheetOpen(false);
          setTimeout(() => {
            setIsCreateFolderDialogOpen(true);
          }, 150);
        }}
      />

      <DriveCreateFolderDialog
        visible={isCreateFolderDialogOpen}
        onClose={() => setIsCreateFolderDialogOpen(false)}
        onCreate={handleConfirmCreateFolder}
      />

      <DriveFileOptionsSheet
        visible={!!selectedFileForOptions}
        item={selectedFileForOptions}
        allItems={files}
        onClose={() => setSelectedFileForOptions(null)}
        onDelete={handleDeleteFile}
        onRename={handleRenameFile}
        onMove={(item) => setSelectedFileForMove(item)}
        onShare={handleShareFile}
        onToggleStar={handleToggleStar}
      />

      <DriveFilePreviewScreen
        visible={!!selectedFileForPreview}
        item={selectedFileForPreview}
        allItems={files}
        onClose={() => setSelectedFileForPreview(null)}
        onDelete={handleDeleteFile}
        onRename={handleRenameFile}
        onMove={(item) => setSelectedFileForMove(item)}
        onToggleStar={handleToggleStar}
      />

      <DriveMoveModal
        visible={!!selectedFileForMove}
        item={selectedFileForMove}
        allItems={files}
        onClose={() => setSelectedFileForMove(null)}
        onMove={handleMoveFile}
      />
    </View>
  );
}
