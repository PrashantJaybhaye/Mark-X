import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";

interface NoteEditorHeaderProps {
  onBack: () => void;
  onUndo: () => void;
  onShare: () => void;
  onMore: () => void;
  inEditMode: boolean;
  onFinishEditing: () => void;
}

export const NoteEditorHeader: React.FC<NoteEditorHeaderProps> = ({
  onBack,
  onUndo,
  onShare,
  onMore,
  inEditMode,
  onFinishEditing,
}) => {
  return (
    <View className="flex-row items-center justify-between px-5 pt-6 pb-3 bg-white">
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "#F2F2F7",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="chevron-back" size={22} color="#1C1C1E" style={{ marginRight: 1 }} />
      </TouchableOpacity>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={onUndo}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#F2F2F7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-undo-outline" size={20} color="#1C1C1E" />
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 44,
            borderRadius: 22,
            backgroundColor: "#F2F2F7",
            overflow: "hidden",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={onShare}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="share-outline" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={onMore}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {inEditMode && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onFinishEditing}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#E5A93C",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#E5A93C",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Ionicons name="checkmark" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
