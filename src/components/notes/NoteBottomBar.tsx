import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

interface NoteBottomBarProps {
  keyboardHeight: number;
  bottomInset: number;
  onInsertChecklist: () => void;
  onInsertAttachment: () => void;
  onToggleFormatSheet: () => void;
  onNewNote: () => void;
}

export const NoteBottomBar: React.FC<NoteBottomBarProps> = ({
  keyboardHeight,
  bottomInset,
  onInsertChecklist,
  onInsertAttachment,
  onToggleFormatSheet,
  onNewNote,
}) => {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom:
          keyboardHeight > 0
            ? keyboardHeight + (Platform.OS === "android" ? 44 : 34)
            : Math.max(bottomInset + 22, 32),
        left: 20,
        right: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 46,
          borderRadius: 23,
          backgroundColor: "#F2F2F7",
          borderWidth: 0.5,
          borderColor: "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={onInsertChecklist}
          style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#1C1C1E" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.65}
          onPress={onInsertAttachment}
          style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="images-outline" size={21} color="#1C1C1E" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.65}
          onPress={onToggleFormatSheet}
          style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: "Outfit_700Bold",
              fontSize: 16,
              color: "#1C1C1E",
              letterSpacing: -0.5,
            }}
          >
            Aa
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.65}
        onPress={onNewNote}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: "#F2F2F7",
          borderWidth: 0.5,
          borderColor: "rgba(0,0,0,0.06)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="add" size={25} color="#1C1C1E" />
      </TouchableOpacity>
    </View>
  );
};
