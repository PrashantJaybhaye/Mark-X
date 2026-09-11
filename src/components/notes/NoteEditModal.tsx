import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { triggerHaptic } from "../../utils/haptics";
import { NoteItem } from "./NoteItemCard";

const NOTE_CATEGORIES = ["General", "Ideas", "Work", "Personal", "Tasks"];

interface NoteEditModalProps {
  visible: boolean;
  note?: NoteItem | null;
  onClose: () => void;
  onSave: (note: { id?: string; title: string; body: string; category: string; isPinned: boolean }) => void;
  onDelete?: (id: string) => void;
}

export function NoteEditModal({
  visible,
  note,
  onClose,
  onSave,
  onDelete,
}: NoteEditModalProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(note?.title || "");
  const [body, setBody] = useState(note?.body || "");
  const [category, setCategory] = useState(note?.category || "General");
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);



  if (!visible) return null;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("Title Required", "Please enter a title for your note.");
      return;
    }

    triggerHaptic();
    onSave({
      id: note?.id,
      title: trimmedTitle,
      body: body.trim(),
      category,
      isPinned,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!note?.id || !onDelete) return;
    Alert.alert(
      "Delete Note",
      `Are you sure you want to delete "${note.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            onDelete(note.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-black/45 justify-end"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />

        <View
          className="bg-white rounded-t-[28px] px-5 pt-3"
          style={{
            maxHeight: "88%",
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          }}
        >
          {/* Handlebar */}
          <View className="items-center py-2">
            <View className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
          </View>

          {/* Modal Header */}
          <View className="flex-row items-center justify-between py-3 border-b border-[#F3F4F6] mb-3">
            <Text
              className="text-[20px] text-[#111111]"
              style={{ fontFamily: "Outfit_700Bold" }}
            >
              {note ? "Edit Note" : "New Note"}
            </Text>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setIsPinned((prev) => !prev);
                }}
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  isPinned ? "bg-[#EB5B49]/15" : "bg-[#F3F4F6]"
                }`}
              >
                <Ionicons
                  name="pin"
                  size={18}
                  color={isPinned ? "#EB5B49" : "#6B7280"}
                />
              </TouchableOpacity>

              {note && onDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  className="w-9 h-9 rounded-full bg-red-50 items-center justify-center"
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onClose}
                className="w-9 h-9 rounded-full bg-[#F3F4F6] items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#111111" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category Selector */}
            <View className="flex-row items-center gap-2 mb-4 py-1">
              {NOTE_CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      triggerHaptic();
                      setCategory(cat);
                    }}
                    className={`px-3 py-1.5 rounded-full border ${
                      selected
                        ? "bg-[#111111] border-[#111111]"
                        : "bg-[#F9FAFB] border-[#E5E7EB]"
                    }`}
                  >
                    <Text
                      className={`text-[12px] ${
                        selected ? "text-white" : "text-[#4B5563]"
                      }`}
                      style={{ fontFamily: "Outfit_500Medium" }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note Title Input */}
            <View className="mb-3">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Note Title"
                placeholderTextColor="#9CA3AF"
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-3 text-[16px] text-[#111111]"
                style={{ fontFamily: "Outfit_600SemiBold" }}
                returnKeyType="next"
              />
            </View>

            {/* Note Body Input */}
            <View className="mb-5">
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Write your note, checklist, or ideas..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 text-[14px] text-[#111111] min-h-[140px]"
                style={{ fontFamily: "Outfit_400Regular" }}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.85}
              className="w-full bg-[#111111] py-3.5 rounded-xl items-center justify-center mb-2"
            >
              <Text
                className="text-[15px] text-white"
                style={{ fontFamily: "Outfit_600SemiBold" }}
              >
                {note ? "Save Changes" : "Create Note"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
