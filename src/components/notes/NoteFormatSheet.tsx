import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface NoteFormatSheetProps {
  visible: boolean;
  bottomInset: number;
  selectedTextStyle: string;
  activeFormats: { [key: string]: boolean };
  onClose: () => void;
  onSelectTextStyle: (style: string) => void;
  onApplyFormat: (format: string) => void;
}

export const NoteFormatSheet: React.FC<NoteFormatSheetProps> = ({
  visible,
  bottomInset,
  selectedTextStyle,
  activeFormats,
  onClose,
  onSelectTextStyle,
  onApplyFormat,
}) => {
  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: "#E5E5EA",
        overflow: "hidden",
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: Math.max(bottomInset + 12, 24),
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <Text
          allowFontScaling={false}
          style={{ fontFamily: "Outfit_700Bold", fontSize: 18, color: "#111111" }}
        >
          Format
        </Text>
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#EFEFF4",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Segmented text style selector */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#F2F2F7",
          borderRadius: 16,
          padding: 3,
          marginBottom: 12,
          height: 44,
        }}
      >
        {["Title", "Heading", "Subheading", "Body"].map((styleName) => {
          const isSelected = selectedTextStyle === styleName;
          return (
            <TouchableOpacity
              key={styleName}
              activeOpacity={0.7}
              onPress={() => onSelectTextStyle(styleName)}
              style={{
                flex: 1,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 13,
                backgroundColor: isSelected ? "#E5A93C" : "transparent",
              }}
            >
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={{
                  fontFamily: isSelected ? "Outfit_600SemiBold" : "Outfit_500Medium",
                  fontSize: styleName === "Subheading" ? 12.5 : 13.5,
                  color: isSelected ? "#FFFFFF" : "#1C1C1E",
                }}
              >
                {styleName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Inline styles: B / I / U / S, marker, color */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F2F2F7",
            borderRadius: 16,
            padding: 3,
            flex: 1,
            marginRight: 8,
            height: 44,
          }}
        >
          {[
            { type: "bold", label: "B", style: { fontFamily: "Outfit_700Bold" } },
            {
              type: "italic",
              label: "I",
              style: { fontFamily: "Outfit_600SemiBold", fontStyle: "italic" as const },
            },
            {
              type: "underline",
              label: "U",
              style: { fontFamily: "Outfit_600SemiBold", textDecorationLine: "underline" as const },
            },
            {
              type: "strikethrough",
              label: "S",
              style: {
                fontFamily: "Outfit_600SemiBold",
                textDecorationLine: "line-through" as const,
              },
            },
          ].map(({ type, label, style }) => {
            const isActive = !!activeFormats[type];
            return (
              <TouchableOpacity
                key={type}
                activeOpacity={0.65}
                onPress={() => onApplyFormat(type)}
                style={{
                  flex: 1,
                  height: 38,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 13,
                  backgroundColor: isActive ? "#FFFFFF" : "transparent",
                }}
              >
                <Text
                  allowFontScaling={false}
                  style={[{ fontSize: 16, color: isActive ? "#E5A93C" : "#1C1C1E" }, style]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => onApplyFormat("marker")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: "#F2F2F7",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Ionicons name="pencil" size={18} color="#1C1C1E" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => onApplyFormat("color")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: "#F2F2F7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#007AFF" }} />
        </TouchableOpacity>
      </View>

      {/* Block formatting: bullets, numbering, indent/outdent */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F2F2F7",
            borderRadius: 16,
            padding: 3,
            flex: 1.3,
            marginRight: 8,
            height: 44,
          }}
        >
          {[
            { type: "bullet", icon: <Ionicons name="list" size={19} color="#1C1C1E" /> },
            { type: "dash", icon: <Ionicons name="remove-outline" size={20} color="#1C1C1E" /> },
            {
              type: "numbered",
              icon: (
                <Text
                  allowFontScaling={false}
                  style={{ fontFamily: "Outfit_700Bold", fontSize: 13, color: "#1C1C1E" }}
                >
                  1.
                </Text>
              ),
            },
          ].map(({ type, icon }) => (
            <TouchableOpacity
              key={type}
              activeOpacity={0.65}
              onPress={() => onApplyFormat(type)}
              style={{
                flex: 1,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 13,
              }}
            >
              {icon}
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F2F2F7",
            borderRadius: 16,
            padding: 3,
            flex: 0.9,
            height: 44,
          }}
        >
          {[
            { type: "outdent", icon: "arrow-back" as const },
            { type: "indent", icon: "arrow-forward" as const },
          ].map(({ type, icon }) => (
            <TouchableOpacity
              key={type}
              activeOpacity={0.65}
              onPress={() => onApplyFormat(type)}
              style={{
                flex: 1,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 13,
              }}
            >
              <Ionicons name={icon} size={17} color="#1C1C1E" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};
