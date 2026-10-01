import React, { memo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "../../utils/haptics";

export interface FolderStackItem {
  id: string | null;
  name: string;
}

interface DriveBreadcrumbsProps {
  folderStack: FolderStackItem[];
  onNavigateToBreadcrumb: (index: number) => void;
  onNavigateBack: () => void;
  itemCount: number;
}

function DriveBreadcrumbsComponent({
  folderStack,
  onNavigateToBreadcrumb,
  onNavigateBack,
  itemCount,
}: DriveBreadcrumbsProps) {
  const isSubFolder = folderStack.length > 1;

  return (
    <View className="flex-row items-center justify-between px-4 py-2.5 bg-white border-b border-[#F0F2F5]">
      {/* Left: Back Arrow + Breadcrumb Trail */}
      <View className="flex-1 flex-row items-center mr-2">
        {isSubFolder && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              onNavigateBack();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-8 h-8 rounded-full bg-[#F1F3F4] items-center justify-center mr-2"
          >
            <Ionicons name="arrow-back" size={18} color="#1F1F1F" />
          </TouchableOpacity>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center" }}
          className="flex-1"
        >
          {folderStack.map((folder, index) => {
            const isLast = index === folderStack.length - 1;
            return (
              <React.Fragment key={folder.id || `root-${index}`}>
                {index > 0 && (
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color="#B4B8BF"
                    style={{ marginHorizontal: 4 }}
                  />
                )}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isLast}
                  onPress={() => {
                    triggerHaptic();
                    onNavigateToBreadcrumb(index);
                  }}
                  className={`px-2 py-1 rounded-lg ${
                    isLast ? "bg-[#E8F0FE]" : "active:bg-[#F1F3F4]"
                  }`}
                >
                  <Text
                    className={`text-[13px] font-outfit-semibold ${
                      isLast ? "text-[#0B57D0]" : "text-[#5F6368]"
                    }`}
                    numberOfLines={1}
                  >
                    {index === 0 && folderStack.length > 1 ? "Drive" : folder.name}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </ScrollView>
      </View>

      {/* Right: Item Count Badge */}
      <View className="bg-[#F1F3F4] px-2.5 py-1 rounded-full">
        <Text className="text-[11px] font-outfit-medium text-[#5F6368]">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </Text>
      </View>
    </View>
  );
}

export const DriveBreadcrumbs = memo(DriveBreadcrumbsComponent);
