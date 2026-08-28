import React, { memo, useCallback, useMemo } from "react";
import { View, Text, FlatList, ListRenderItem } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DriveItem } from "../../utils/driveFileTypes";
import { DriveFileItem } from "./DriveFileItem";

interface DriveFileListProps {
  files: DriveItem[];
  searchQuery: string;
  activeTab: "suggested" | "activity";
  contentPaddingBottom?: number;
  onItemPress?: (item: DriveItem) => void;
  onOptionsPress?: (item: DriveItem) => void;
}

function DriveFileListComponent({
  files,
  searchQuery,
  activeTab,
  contentPaddingBottom = 80,
  onItemPress,
  onOptionsPress,
}: DriveFileListProps) {
  const query = searchQuery.trim().toLowerCase();

  /**
   * Filter only when the actual files or query changes.
   */
  const filteredFiles = useMemo(() => {
    if (!query) return files;
    return files.filter((file) => file.name.toLowerCase().includes(query));
  }, [files, query]);

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
      return (
        <DriveFileItem
          item={item}
          onPress={handleItemPress}
          onOptionsPress={handleOptionsPress}
        />
      );
    },
    [handleItemPress, handleOptionsPress]
  );

  const keyExtractor = useCallback((item: DriveItem) => item.id, []);

  const headerTitle = activeTab === "suggested" ? "Suggested Files" : "Recent Activity";

  /**
   * Keep the header lightweight and memoized.
   */
  const listHeader = useMemo(() => {
    if (filteredFiles.length === 0) return null;

    return (
      <View className="flex-row items-center justify-between mb-2.5 px-1">
        <Text className="text-[13px] font-outfit-semibold text-[#70757A] uppercase tracking-wider">
          {headerTitle}
        </Text>

        <Text className="text-[12px] font-outfit text-[#9AA0A6]">
          {filteredFiles.length} {filteredFiles.length === 1 ? "item" : "items"}
        </Text>
      </View>
    );
  }, [filteredFiles.length, headerTitle]);

  /**
   * Search empty state.
   */
  const listEmpty = useMemo(() => {
    if (!query) return null;

    return (
      <View className="items-center justify-center py-16 px-6">
        <View className="w-14 h-14 rounded-full bg-[#F1F3F4] items-center justify-center mb-3">
          <Ionicons name="search-outline" size={24} color="#70757A" />
        </View>

        <Text className="text-[16px] font-outfit-bold text-[#1F1F1F] mb-1">
          No files found
        </Text>

        <Text className="text-[13px] font-outfit text-[#70757A] text-center">
          No results match "{searchQuery}". Try another filename or type.
        </Text>
      </View>
    );
  }, [query, searchQuery]);

  const renderSeparator = useCallback(
    () => <View style={{ height: 10 }} />,
    []
  );

  return (
    <FlatList
      className="flex-1"
      data={filteredFiles}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={renderSeparator}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      contentContainerStyle={{
        paddingHorizontal: 16,
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
      previous.activeTab === next.activeTab &&
      previous.contentPaddingBottom === next.contentPaddingBottom &&
      previous.onItemPress === next.onItemPress &&
      previous.onOptionsPress === next.onOptionsPress
    );
  }
);
