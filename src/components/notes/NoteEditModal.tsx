import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../../utils/haptics";
import { NoteItem } from "./NoteItemCard";

const NOTE_CATEGORIES = ["General", "Ideas", "Work", "Personal", "Tasks"];

interface NoteEditModalProps {
  visible: boolean;
  note?: NoteItem | null;
  onClose: () => void;
  onSave: (note: {
    id?: string;
    title: string;
    body: string;
    category: string;
    isPinned: boolean;
  }) => void;
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
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [category, setCategory] = useState(note?.category ?? "General");
  const [isPinned, setIsPinned] = useState(note?.isPinned ?? false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Undo history stack
  const historyRef = useRef<{ title: string; body: string }[]>([]);
  const bodyRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTitle(note?.title ?? "");
      setBody(note?.body ?? "");
      setCategory(note?.category ?? "General");
      setIsPinned(note?.isPinned ?? false);
      historyRef.current = [];
    }
  }, [visible, note?.id]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!visible) return null;

  // Auto-save & close
  const persistAndClose = () => {
    Keyboard.dismiss();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    // If both empty and new, just close without creating empty note
    if (!trimmedTitle && !trimmedBody && !note?.id) {
      onClose();
      return;
    }

    // Auto-resolve title if user only wrote in body
    let resolvedTitle = trimmedTitle;
    if (!resolvedTitle && trimmedBody) {
      const firstLine = trimmedBody.split("\n")[0].trim();
      resolvedTitle = firstLine.length > 40 ? firstLine.substring(0, 40) + "…" : firstLine;
    }
    if (!resolvedTitle) {
      resolvedTitle = "New Note";
    }

    onSave({
      id: note?.id,
      title: resolvedTitle,
      body: trimmedBody,
      category,
      isPinned,
    });
    onClose();
  };

  const handleBack = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    persistAndClose();
  };

  // Push history before changes for undo
  const handleTitleChange = (nextTitle: string) => {
    if (Math.abs(nextTitle.length - title.length) > 3) {
      historyRef.current.push({ title, body });
    }
    setTitle(nextTitle);
  };

  const handleBodyChange = (nextBody: string) => {
    if (Math.abs(nextBody.length - body.length) > 4) {
      historyRef.current.push({ title, body });
    }
    setBody(nextBody);
  };

  const handleUndo = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (historyRef.current.length > 0) {
      const prev = historyRef.current.pop()!;
      setTitle(prev.title);
      setBody(prev.body);
    }
  };

  const handleShare = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const content = [title.trim(), body.trim()].filter(Boolean).join("\n\n");
    if (!content) return;
    try {
      await Share.share({
        title: title || "Note",
        message: content,
      });
    } catch {
      // ignore
    }
  };

  const handleDelete = () => {
    if (!note?.id || !onDelete) return;
    Alert.alert("Delete note", `Delete "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
          onDelete(note.id);
          onClose();
        },
      },
    ]);
  };

  const handleMore = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      note?.title || "Note Options",
      undefined,
      [
        {
          text: isPinned ? "Unpin note" : "Pin note",
          onPress: () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            setIsPinned((p) => !p);
          },
        },
        {
          text: "Category: " + category,
          onPress: () => {
            Alert.alert(
              "Select Category",
              undefined,
              NOTE_CATEGORIES.map((cat) => ({
                text: cat + (cat === category ? "  ✓" : ""),
                onPress: () => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setCategory(cat);
                },
              }))
            );
          },
        },
        ...(note?.id && onDelete
          ? [{ text: "Delete note", style: "destructive" as const, onPress: handleDelete }]
          : []),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  // Floating toolbar actions
  const handleInsertChecklist = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    historyRef.current.push({ title, body });
    const prefix = body.length === 0 || body.endsWith("\n") ? "" : "\n";
    setBody((prev) => prev + prefix + "• ");
    bodyRef.current?.focus();
  };

  const handleInsertAttachment = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    historyRef.current.push({ title, body });
    const prefix = body.length === 0 || body.endsWith("\n") ? "" : "\n";
    setBody((prev) => prev + prefix + "📎 ");
    bodyRef.current?.focus();
  };

  const handleNewNote = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    // Save current note
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (trimmedTitle || trimmedBody) {
      let resolvedTitle = trimmedTitle;
      if (!resolvedTitle && trimmedBody) {
        const firstLine = trimmedBody.split("\n")[0].trim();
        resolvedTitle = firstLine.length > 40 ? firstLine.substring(0, 40) + "…" : firstLine;
      }
      onSave({
        id: note?.id,
        title: resolvedTitle || "New Note",
        body: trimmedBody,
        category,
        isPinned,
      });
    }
    // Reset to brand new blank note
    setTitle("");
    setBody("");
    setCategory("General");
    setIsPinned(false);
    historyRef.current = [];
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={handleBack}>
      <View className="flex-1 bg-white">
        {/* ── Top Navigation Bar (Apple Notes style) ── */}
        <View
          style={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }}
          className="flex-row items-center justify-between pb-3 bg-white"
        >
          {/* Back chevron in circle */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-11 h-11 rounded-full bg-[#F5F5F7] items-center justify-center"
          >
            <Ionicons name="chevron-back" size={22} color="#111111" />
          </TouchableOpacity>

          {/* Right action group (Undo, Share, More) */}
          <View className="flex-row items-center gap-2.5">
            {/* Undo */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleUndo}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-11 h-11 rounded-full bg-[#F5F5F7] items-center justify-center"
            >
              <Ionicons name="arrow-undo-outline" size={20} color="#111111" />
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-11 h-11 rounded-full bg-[#F5F5F7] items-center justify-center"
            >
              <Ionicons name="share-outline" size={20} color="#111111" />
            </TouchableOpacity>

            {/* More */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleMore}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-11 h-11 rounded-full bg-[#F5F5F7] items-center justify-center"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Note Content (Title & Body) ── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 120,
            }}
          >
            {/* Title */}
            <TextInput
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Title"
              placeholderTextColor="#C7C7CC"
              returnKeyType="next"
              onSubmitEditing={() => bodyRef.current?.focus()}
              blurOnSubmit={false}
              allowFontScaling={false}
              className="p-0 mb-3 text-[#111111]"
              style={{
                fontFamily: "Outfit_700Bold",
                fontSize: 32,
                lineHeight: 40,
              }}
            />

            {/* Body */}
            <TextInput
              ref={bodyRef}
              value={body}
              onChangeText={handleBodyChange}
              placeholder="Note"
              placeholderTextColor="#C7C7CC"
              multiline
              textAlignVertical="top"
              allowFontScaling={false}
              className="p-0 text-[#27272A]"
              style={{
                fontFamily: "Outfit_400Regular",
                fontSize: 16.5,
                lineHeight: 26,
                minHeight: 450,
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Floating Bottom Toolbar (Exact Apple Notes match) ── */}
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            bottom: keyboardHeight > 0 ? keyboardHeight + 12 : Math.max(insets.bottom + 12, 24),
            left: 20,
            right: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left Island: Checklist, Paperclip, Markup */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 26,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: "#F5F5F7",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            {/* Checklist */}
            <TouchableOpacity
              activeOpacity={0.65}
              onPress={handleInsertChecklist}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="list-outline" size={22} color="#1C1C1E" />
            </TouchableOpacity>

            {/* Paperclip */}
            <TouchableOpacity
              activeOpacity={0.65}
              onPress={handleInsertAttachment}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="attach-outline" size={22} color="#1C1C1E" />
            </TouchableOpacity>

            {/* Markup tool */}
            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                // Toggle bold or markup indicator
                const prefix = body.length === 0 || body.endsWith("\n") ? "" : "\n";
                setBody((prev) => prev + prefix + "✍️ ");
                bodyRef.current?.focus();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="color-palette-outline" size={21} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          {/* Right Island: Compose / New Note */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleNewNote}
            style={{
              width: 52,
              height: 52,
              borderRadius: 20,
              backgroundColor: "#F5F5F7",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Ionicons name="create-outline" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

