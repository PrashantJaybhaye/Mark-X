import React, { memo, useCallback, useMemo } from "react";
import { View, Text, FlatList, ListRenderItem } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DriveItem } from "../../utils/driveFileTypes";
import { DriveFileItem } from "./DriveFileItem";

interface DriveFileListProps {
  files: DriveItem[];
  searchQuery: string;
  currentFolderId?: string | null;
  viewMode?: "list" | "grid";
  sortOrder?: "asc" | "desc";
  contentPaddingBottom?: number;
  onItemPress?: (item: DriveItem) => void;
  onOptionsPress?: (item: DriveItem) => void;
}

function DriveFileListComponent({
  files,
  searchQuery,
  currentFolderId = null,
  viewMode = "list",
  sortOrder = "asc",
  contentPaddingBottom = 80,
  onItemPress,
  onOptionsPress,
}: DriveFileListProps) {
  const query = searchQuery.trim().toLowerCase();

  /**
   * Pre-calculate folder child item counts map: folderId -> count
   */
  const childCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of files) {
      if (item.parentId) {
        map[item.parentId] = (map[item.parentId] || 0) + 1;
      }
    }
    return map;
  }, [files]);

  /**
   * Filter and sort files.
   */
  const filteredFiles = useMemo(() => {
    let result = files;

    // If searching, search across everything
    if (query) {
      result = result.filter((file) => file.name.toLowerCase().includes(query));
    } else {
      // Filter by folder hierarchy when not searching
      result = result.filter((file) => {
        if (!currentFolderId) {
          return !file.parentId; // Root level items
        }
        return file.parentId === currentFolderId;
      });
    }

    // Sort files by name (or folders first then files)
    result = [...result].sort((a, b) => {
      // Keep folders at top
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      const comp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? comp : -comp;
    });

    return result;
  }, [files, currentFolderId, query, sortOrder]);

  /**
   * Stable item press handler.
   */
  const handleItemPress = useCallback(
    (item: DriveItem) => {
      onItemPress?.(item);
    },
    [onItemPress]
  );

  /**
   * Stable options handler.
   */
  const handleOptionsPress = useCallback(
    (item: DriveItem) => {
      onOptionsPress?.(item);
    },
    [onOptionsPress]
  );

  /**
   * FlatList render function with stable memoized row item.
   */
  const renderItem: ListRenderItem<DriveItem> = useCallback(
    ({ item }) => {
      const count = item.isFolder ? childCountMap[item.id] || 0 : undefined;
      return (
        <DriveFileItem
          item={item}
          viewMode={viewMode}
          childCount={count}
          onPress={handleItemPress}
          onOptionsPress={handleOptionsPress}
        />
      );
    },
    [childCountMap, viewMode, handleItemPress, handleOptionsPress]
  );

  const keyExtractor = useCallback((item: DriveItem) => item.id, []);

  /**
   * Empty state logic.
   */
  const listEmpty = useMemo(() => {
    if (query) {
      return (
        <View className="items-center justify-center py-16 px-6">
          <View className="w-14 h-14 rounded-full bg-[#F1F3F4] items-center justify-center mb-3">
            <Ionicons name="search-outline" size={24} color="#70757A" />
          </View>
          <Text className="text-[16px] font-outfit-bold text-[#1F1F1F] mb-1">
            No files found
          </Text>
          <Text className="text-[13px] font-outfit text-[#70757A] text-center">
            No results match “{searchQuery}”. Try another filename or type.
          </Text>
        </View>
      );
    }

    if (currentFolderId) {
      return (
        <View className="items-center justify-center py-16 px-6">
          <View className="w-16 h-16 rounded-full bg-[#E8F0FE] items-center justify-center mb-3">
            <Ionicons name="folder-open-outline" size={32} color="#0B57D0" />
          </View>
          <Text className="text-[16px] font-outfit-bold text-[#1F1F1F] mb-1">
            This folder is empty
          </Text>
          <Text className="text-[13px] font-outfit text-[#70757A] text-center max-w-[260px]">
            Tap the + button below to add documents, notes, or subfolders.
          </Text>
        </View>
      );
    }

    return null;
  }, [query, searchQuery, currentFolderId]);

  const renderSeparator = useCallback(
    () => (viewMode === "grid" ? null : <View style={{ height: 10 }} />),
    [viewMode]
  );

  return (
    <FlatList
      key={viewMode}
      className="flex-1"
      data={filteredFiles}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={viewMode === "grid" ? 2 : 1}
      ItemSeparatorComponent={renderSeparator}
      ListEmptyComponent={listEmpty}
      contentContainerStyle={{
        paddingHorizontal: viewMode === "grid" ? 10 : 16,
        paddingTop: 12,
        paddingBottom: contentPaddingBottom,
      }}
      showsVerticalScrollIndicator={false}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      removeClippedSubviews={false}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={11}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
    />
  );
}

export const DriveFileList = memo(
  DriveFileListComponent,
  (previous, next) => {
    return (
      previous.files === next.files &&
      previous.searchQuery === next.searchQuery &&
      previous.currentFolderId === next.currentFolderId &&
      previous.viewMode === next.viewMode &&
      previous.sortOrder === next.sortOrder &&
      previous.contentPaddingBottom === next.contentPaddingBottom &&
      previous.onItemPress === next.onItemPress &&
      previous.onOptionsPress === next.onOptionsPress
    );
  }
);
