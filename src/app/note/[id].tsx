import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  ScrollView,
  Share,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { IosDialog } from "../../components/common/IosDialog";
import {
  deleteNoteById,
  getNoteById,
  saveSingleNote,
} from "../../services/storageService";
import { syncNoteToFirestore, deleteNoteFromFirestore } from "../../services/notesSyncService";
import { triggerHaptic } from "../../utils/haptics";


const BLOCK_TYPOGRAPHY: Record<string, { fontFamily: string; fontSize: number; lineHeight: number; color: string; includeFontPadding: boolean }> = {
  title: { fontFamily: "Outfit_700Bold", fontSize: 24, lineHeight: 28, color: "#111111", includeFontPadding: false },
  heading: { fontFamily: "Outfit_700Bold", fontSize: 20, lineHeight: 25, color: "#1C1C1E", includeFontPadding: false },
  subheading: { fontFamily: "Outfit_600SemiBold", fontSize: 17, lineHeight: 22, color: "#27272A", includeFontPadding: false },
  paragraph: { fontFamily: "Outfit_400Regular", fontSize: 15, lineHeight: 20, color: "#27272A", includeFontPadding: false },
};

function renderInlineContent(text: string, baseStyle: any) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|<u>[^<]+<\/u>)/g);
  if (parts.length <= 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <Text key={i} style={[baseStyle, { fontFamily: "Outfit_700Bold", fontWeight: "700" }]}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <Text key={i} style={[baseStyle, { fontStyle: "italic" }]}>{part.slice(1, -1)}</Text>;
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      return <Text key={i} style={[baseStyle, { textDecorationLine: "line-through" }]}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith("<u>") && part.endsWith("</u>") && part.length > 7) {
      return <Text key={i} style={[baseStyle, { textDecorationLine: "underline" }]}>{part.slice(3, -4)}</Text>;
    }
    return part;
  });
}

export type BlockType = "paragraph" | "title" | "heading" | "subheading" | "todo" | "bullet" | "numbered";

export interface NoteBlock {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

function parseFormattedText(rawText: string) {
  let text = rawText;
  let bold = false, italic = false, underline = false, strikethrough = false;
  let changed = true;
  while (changed) {
    changed = false;
    const t = text.trim();
    if (t.startsWith("<u>") && t.endsWith("</u>") && t.length >= 7) { underline = true; text = t.slice(3, -4); changed = true; }
    if (t.startsWith("~~") && t.endsWith("~~") && t.length >= 4) { strikethrough = true; text = t.slice(2, -2); changed = true; }
    if (t.startsWith("**") && t.endsWith("**") && t.length >= 4) { bold = true; text = t.slice(2, -2); changed = true; }
    if (t.startsWith("*") && t.endsWith("*") && t.length >= 2) { italic = true; text = t.slice(1, -1); changed = true; }
  }
  return { text, bold, italic, underline, strikethrough };
}

function formatBlockText(block: NoteBlock): string {
  let text = block.text;
  if (block.bold) text = `**${text}**`;
  if (block.italic) text = `*${text}*`;
  if (block.strikethrough) text = `~~${text}~~`;
  if (block.underline) text = `<u>${text}</u>`;
  return text;
}

function parseBodyToBlocks(raw: string): NoteBlock[] {
  if (!raw) return [{ id: `b-${Date.now()}-0`, type: "paragraph", text: "" }];
  return raw.split("\n").map((line, idx) => {
    const id = `b-${Date.now()}-${idx}`;
    const trimmed = line.trim();
    let blockType: BlockType = "paragraph";
    let content = line;
    let checked: boolean | undefined = undefined;

    if (trimmed.startsWith("# ")) {
      blockType = "title"; content = line.slice(line.indexOf("# ") + 2);
    } else if (trimmed.startsWith("## ")) {
      blockType = "heading"; content = line.slice(line.indexOf("## ") + 3);
    } else if (trimmed.startsWith("### ")) {
      blockType = "subheading"; content = line.slice(line.indexOf("### ") + 4);
    } else {
      const todoMatch = line.match(/^(\s*)([•\-\*–—]\s*)?\[([ xX])\]\s*(.*)$/);
      if (todoMatch) {
        blockType = "todo"; content = todoMatch[4]; checked = todoMatch[3].toLowerCase() === "x";
      } else {
        const bulletMatch = line.match(/^(\s*)[•\-\*–—]\s+(.*)$/);
        if (bulletMatch) {
          blockType = "bullet"; content = bulletMatch[2];
        } else {
          const numMatch = line.match(/^(\s*)\d+[\.\)]\s+(.*)$/);
          if (numMatch) {
            blockType = "numbered"; content = numMatch[2];
          }
        }
      }
    }

    const { text, bold, italic, underline, strikethrough } = parseFormattedText(content);
    return { id, type: blockType, text, checked, bold: bold || undefined, italic: italic || undefined, underline: underline || undefined, strikethrough: strikethrough || undefined };
  });
}

function blocksToBody(blocks: NoteBlock[]): string {
  let num = 1;
  return blocks.map((b) => {
    const text = formatBlockText(b);
    if (b.type === "title") { num = 1; return `# ${text}`; }
    if (b.type === "heading") { num = 1; return `## ${text}`; }
    if (b.type === "subheading") { num = 1; return `### ${text}`; }
    if (b.type === "todo") { num = 1; return `[${b.checked ? "x" : " "}] ${text}`; }
    if (b.type === "bullet") { num = 1; return `• ${text}`; }
    if (b.type === "numbered") return `${num++}. ${text}`;
    num = 1;
    return text;
  }).join("\n");
}

export default function NoteDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isNewNote = !id || id === "new";
  const [noteId, setNoteId] = useState<string>(() =>
    isNewNote ? `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : id
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => parseBodyToBlocks(""));
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const pendingFocusRef = useRef<string | null>(null);

  const [isPinned, setIsPinned] = useState(false);
  const [createdAt, setCreatedAt] = useState("");

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isEditing, setIsEditing] = useState(isNewNote);
  const [showFormatSheet, setShowFormatSheet] = useState(false);
  const [selectedTextStyle, setSelectedTextStyle] = useState("Body");
  const [activeFormats, setActiveFormats] = useState<{ [key: string]: boolean }>({});

  const [activeDialog, setActiveDialog] = useState<"delete" | "more" | "unsaved" | null>(null);

  const historyRef = useRef<{ title: string; body: string }[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      if (Platform.OS === "android") RNStatusBar.setBarStyle("dark-content");
    }, [])
  );

  useEffect(() => {
    let isMounted = true;
    if (!isNewNote && id) {
      getNoteById(id).then((note) => {
        if (isMounted && note) {
          setTitle(note.title);
          const raw = note.body ?? "";
          setBody(raw);
          setBlocks(parseBodyToBlocks(raw));
          setIsPinned(note.isPinned ?? false);
          setCreatedAt(note.createdAt ?? "");
        }
      });
    }
    return () => { isMounted = false; };
  }, [id, isNewNote]);

  useEffect(() => {
    const cur = blocks[activeBlockIndex];
    if (cur) {
      const nextStyle =
        cur.type === "title" ? "Title" : cur.type === "heading" ? "Heading" : cur.type === "subheading" ? "Subheading" : "Body";
      setSelectedTextStyle((prev) => (prev !== nextStyle ? nextStyle : prev));
      setActiveFormats((prev) => {
        const b = !!cur.bold;
        const it = !!cur.italic;
        const u = !!cur.underline;
        const s = !!cur.strikethrough;
        if (prev.bold === b && prev.italic === it && prev.underline === u && prev.strikethrough === s) {
          return prev;
        }
        return { bold: b, italic: it, underline: u, strikethrough: s };
      });
    }
  }, [activeBlockIndex, blocks]);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const latestBlocksRef = useRef<NoteBlock[]>(blocks);
  latestBlocksRef.current = blocks;
  const latestTitleRef = useRef<string>(title);
  latestTitleRef.current = title;
  const isPinnedRef = useRef<boolean>(isPinned);
  isPinnedRef.current = isPinned;
  const isDeletedRef = useRef(false);
  const hasUnsavedChanges = useRef(false);

  const commitNote = useCallback(
    async (currentTitle: string, currentBody: string, currentPinned: boolean) => {
      const trimmedTitle = currentTitle.trim();
      const trimmedBody = currentBody.trim();
      if (!trimmedTitle && !trimmedBody) return;

      const resolvedTitle = trimmedTitle || (trimmedBody ? trimmedBody.split("\n")[0].trim().slice(0, 40) : "") || "New Note";
      const formattedDate = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const finalCreatedAt = createdAt || formattedDate;
      await saveSingleNote({
        id: noteId,
        title: resolvedTitle,
        body: trimmedBody,
        isPinned: currentPinned,
        createdAt: finalCreatedAt,
        updatedAt: formattedDate,
      });
      return { createdAt: finalCreatedAt, updatedAt: formattedDate };
    },
    [noteId, createdAt]
  );

  const updateBlocksAndSave = (updater: (prev: NoteBlock[]) => NoteBlock[]) => {
    setBlocks((prev) => {
      const next = updater(prev);
      latestBlocksRef.current = next;
      const newBody = blocksToBody(next);
      setBody(newBody);
      hasUnsavedChanges.current = true;
      return next;
    });
  };

  const handleBack = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    
    if (hasUnsavedChanges.current) {
      setActiveDialog("unsaved");
      return;
    }
    
    router.back();
  };

  const handleSaveAndExit = async () => {
    await handleFinishEditing();
    router.back();
  };

  const handleFinishEditing = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setIsEditing(false);
    setShowFormatSheet(false);
    const currentBody = blocksToBody(latestBlocksRef.current);
    const dates = await commitNote(latestTitleRef.current, currentBody, isPinnedRef.current);
    if (dates) {
      syncNoteToFirestore({
        id: noteId,
        title: latestTitleRef.current,
        body: currentBody,
        isPinned: isPinnedRef.current,
        createdAt: dates.createdAt,
        updatedAt: dates.updatedAt,
      });
    }
    hasUnsavedChanges.current = false;
  };

  const handleTitleChange = (nextTitle: string) => {
    const currentBody = blocksToBody(latestBlocksRef.current);
    if (Math.abs(nextTitle.length - title.length) > 3) historyRef.current.push({ title, body: currentBody });
    setTitle(nextTitle);
    latestTitleRef.current = nextTitle;
    hasUnsavedChanges.current = true;
  };

  // Removed automatic unmount save to ensure explicit saving

  const handleUndo = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (historyRef.current.length > 0) {
      const prev = historyRef.current.pop()!;
      setTitle(prev.title);
      setBody(prev.body);
      setBlocks(parseBodyToBlocks(prev.body));
      hasUnsavedChanges.current = true;
    }
  };

  const handleShare = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const content = [title.trim(), body.trim()].filter(Boolean).join("\n\n");
    if (!content) return;
    try { await Share.share({ title: title || "Note", message: content }); } catch { }
  };

  const handleDeleteConfirmed = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    isDeletedRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (noteId) {
      await deleteNoteById(noteId);
      deleteNoteFromFirestore(noteId);
    }
    router.back();
  };

  const handleToggleCheckbox = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    updateBlocksAndSave((prev) => prev.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b)));
  };

  const handleInsertChecklist = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    historyRef.current.push({ title, body });
    updateBlocksAndSave((prev) => {
      const updated = [...prev];
      const cur = updated[activeBlockIndex];
      if (cur && cur.text.trim() === "" && cur.type === "paragraph") {
        updated[activeBlockIndex] = { ...cur, type: "todo", checked: false };
        setTimeout(() => inputRefs.current[cur.id]?.focus(), 50);
      } else {
        const newId = `b-${Date.now()}`;
        const insertAt = activeBlockIndex >= 0 && activeBlockIndex < updated.length ? activeBlockIndex + 1 : updated.length;
        updated.splice(insertAt, 0, { id: newId, type: "todo", text: "", checked: false });
        setActiveBlockIndex(insertAt);
        setTimeout(() => inputRefs.current[newId]?.focus(), 50);
      }
      return updated;
    });
  };

  const handleInsertAttachment = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    historyRef.current.push({ title, body });
    updateBlocksAndSave((prev) => {
      const updated = [...prev];
      const cur = updated[activeBlockIndex];
      if (cur) {
        updated[activeBlockIndex] = { ...cur, text: cur.text ? cur.text + " 📎" : "📎 " };
        setTimeout(() => inputRefs.current[cur.id]?.focus(), 50);
      } else {
        const newId = `b-${Date.now()}`;
        updated.push({ id: newId, type: "paragraph", text: "📎 " });
        setTimeout(() => inputRefs.current[newId]?.focus(), 50);
      }
      return updated;
    });
  };

  const handleNewNote = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    commitNote(title, body, isPinned);
    setNoteId(`note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    setTitle("");
    setBody("");
    setBlocks(parseBodyToBlocks(""));
    setActiveBlockIndex(0);
    setIsPinned(false);
    setCreatedAt("");
    setIsEditing(true);
    setShowFormatSheet(false);
    hasUnsavedChanges.current = false;
  };

  const handleApplyFormat = (type: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    historyRef.current.push({ title, body });

    updateBlocksAndSave((prev) => {
      const updated = [...prev];
      const cur = updated[activeBlockIndex];
      if (!cur) return prev;

      if (type === "outdent") {
        if (cur.text.startsWith("  ")) updated[activeBlockIndex] = { ...cur, text: cur.text.slice(2) };
      } else if (type === "indent") {
        updated[activeBlockIndex] = { ...cur, text: "  " + cur.text };
      } else if (type === "bullet" || type === "dash" || type === "numbered") {
        const listType = type === "numbered" ? "numbered" : "bullet";
        updated[activeBlockIndex] = { ...cur, type: cur.type === listType ? "paragraph" : listType };
      } else if (["bold", "italic", "underline", "strikethrough"].includes(type)) {
        const key = type as "bold" | "italic" | "underline" | "strikethrough";
        const nextVal = !cur[key];
        updated[activeBlockIndex] = { ...cur, [key]: nextVal || undefined };
        setActiveFormats((p) => ({ ...p, [key]: nextVal }));
      } else if (type === "marker") {
        updated[activeBlockIndex] = { ...cur, text: cur.text ? `✍️ ${cur.text}` : "✍️ " };
      } else if (type === "color") {
        updated[activeBlockIndex] = { ...cur, text: cur.text ? `🔹 ${cur.text}` : "🔹 " };
      }
      return updated;
    });
  };

  const handleSelectTextStyle = (styleName: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTextStyle(styleName);
    const typeMap: Record<string, BlockType> = { Title: "title", Heading: "heading", Subheading: "subheading", Body: "paragraph" };
    const targetType = typeMap[styleName] || "paragraph";

    updateBlocksAndSave((prev) => {
      const updated = [...prev];
      if (updated[activeBlockIndex]) updated[activeBlockIndex] = { ...updated[activeBlockIndex], type: targetType };
      return updated;
    });
    const curId = blocks[activeBlockIndex]?.id;
    if (curId) inputRefs.current[curId]?.focus();
  };

  const handleBlockChangeText = (id: string, index: number, text: string) => {
    if (text.includes("\n")) {
      const parts = text.split("\n");
      const currentText = parts[0];
      const nextText = parts.slice(1).join("\n");
      const cur = blocks[index];
      if (!cur) return;

      if ((cur.type === "todo" || cur.type === "bullet" || cur.type === "numbered") && cur.text.trim() === "") {
        updateBlocksAndSave((prev) => {
          const updated = [...prev];
          updated[index] = { ...cur, type: "paragraph", text: "" };
          return updated;
        });
        return;
      }

      const nextType: BlockType = ["todo", "bullet", "numbered"].includes(cur.type) ? cur.type : "paragraph";

      if (parts.length > 2) {
        const newBlocks: NoteBlock[] = parts.slice(1).map((partText) => ({
          id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: nextType,
          text: partText,
          checked: false,
          bold: cur.bold,
          italic: cur.italic,
          underline: cur.underline,
          strikethrough: cur.strikethrough,
        }));

        updateBlocksAndSave((prev) => {
          const updated = [...prev];
          updated[index] = { ...cur, text: currentText };
          updated.splice(index + 1, 0, ...newBlocks);
          return updated;
        });

        const lastNewId = newBlocks[newBlocks.length - 1].id;
        pendingFocusRef.current = lastNewId;
        setActiveBlockIndex(index + newBlocks.length);
        return;
      }

      const newId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newBlock: NoteBlock = {
        id: newId,
        type: nextType,
        text: nextText,
        checked: false,
        bold: cur.bold,
        italic: cur.italic,
        underline: cur.underline,
        strikethrough: cur.strikethrough,
      };

      updateBlocksAndSave((prev) => {
        const updated = [...prev];
        updated[index] = { ...cur, text: currentText };
        updated.splice(index + 1, 0, newBlock);
        return updated;
      });

      pendingFocusRef.current = newId;
      setActiveBlockIndex(index + 1);
      return;
    }

    updateBlocksAndSave((prev) => {
      const updated = [...prev];
      if (updated[index]) updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  const handleKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === "Backspace") {
      const cur = blocks[index];
      if (cur && cur.text === "") {
        if (cur.type !== "paragraph") {
          updateBlocksAndSave((prev) => {
            const updated = [...prev];
            updated[index] = { ...cur, type: "paragraph" };
            return updated;
          });
          return;
        }
        if (blocks.length > 1 && index > 0) {
          const prevBlock = blocks[index - 1];
          updateBlocksAndSave((prev) => prev.filter((_, i) => i !== index));
          setActiveBlockIndex(index - 1);
          inputRefs.current[prevBlock.id]?.focus();
        }
      }
    }
  };

  const handleCanvasPress = () => {
    setIsEditing(true);
    if (blocks.length === 0) {
      const newId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      pendingFocusRef.current = newId;
      setBlocks([{ id: newId, type: "paragraph", text: "" }]);
      setActiveBlockIndex(0);
      setTimeout(() => inputRefs.current[newId]?.focus(), 15);
    } else {
      const lastIndex = blocks.length - 1;
      const last = blocks[lastIndex];
      if (last.text.trim() === "") {
        setActiveBlockIndex(lastIndex);
        inputRefs.current[last.id]?.focus();
      } else {
        const newId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        pendingFocusRef.current = newId;
        setBlocks((prev) => [...prev, { id: newId, type: "paragraph", text: "" }]);
        setActiveBlockIndex(blocks.length);
        setTimeout(() => inputRefs.current[newId]?.focus(), 15);
      }
    }
  };

  const inEditMode = isEditing || keyboardHeight > 0 || showFormatSheet;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 pt-6 pb-3 bg-white">
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={22} color="#1C1C1E" style={{ marginRight: 1 }} />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={handleUndo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="arrow-undo-outline" size={20} color="#1C1C1E" />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", height: 44, borderRadius: 22, backgroundColor: "#F2F2F7", overflow: "hidden" }}>
            <TouchableOpacity activeOpacity={0.65} onPress={handleShare} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="share-outline" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveDialog("more"); }}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          {inEditMode && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleFinishEditing}
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

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: Platform.OS === "ios" && keyboardHeight > 0 ? keyboardHeight + 110 : 160,
            flexGrow: 1,
          }}
        >
          {inEditMode ? (
            <TextInput
              value={title}
              onFocus={() => setIsEditing(true)}
              onChangeText={handleTitleChange}
              placeholder="Title"
              placeholderTextColor="#C7C7CC"
              returnKeyType="next"
              onSubmitEditing={() => { const firstId = blocks[0]?.id; if (firstId) inputRefs.current[firstId]?.focus(); }}
              blurOnSubmit={false}
              allowFontScaling={false}
              className="p-0 mb-3 text-[#111111]"
              style={{
                fontFamily: "Outfit_700Bold",
                fontSize: 30,
                lineHeight: 38,
                paddingVertical: 0,
                paddingHorizontal: 0,
                includeFontPadding: false,
              }}
            />
          ) : (
            <Pressable onPress={() => { setIsEditing(true); const firstId = blocks[0]?.id; if (firstId) setTimeout(() => inputRefs.current[firstId]?.focus(), 80); }}>
              <Text
                allowFontScaling={false}
                className="p-0 mb-3 text-[#111111]"
                style={{
                  fontFamily: "Outfit_700Bold",
                  fontSize: 30,
                  lineHeight: 38,
                  includeFontPadding: false,
                }}
              >
                {title.trim() || "Untitled Note"}
              </Text>
            </Pressable>
          )}

          <View style={{ minHeight: 320 }}>
            {blocks.map((block, index) => {
              let currentNum = 1;
              if (block.type === "numbered") {
                let count = 1;
                for (let i = index - 1; i >= 0; i--) {
                  if (blocks[i].type === "numbered") count++;
                  else break;
                }
                currentNum = count;
              }
              const isTodo = block.type === "todo";
              const isBullet = block.type === "bullet";
              const isNumbered = block.type === "numbered";

              const fontStyle: any = { ...(BLOCK_TYPOGRAPHY[block.type] || BLOCK_TYPOGRAPHY.paragraph) };
              if (block.bold) { fontStyle.fontFamily = "Outfit_700Bold"; fontStyle.fontWeight = "bold"; }
              if (block.italic) fontStyle.fontStyle = "italic";
              const decs: string[] = [];
              if (block.underline) decs.push("underline");
              if (block.strikethrough || (isTodo && block.checked)) decs.push("line-through");
              if (decs.length > 0) fontStyle.textDecorationLine = decs.join(" ");
              if (isTodo && block.checked) fontStyle.color = "#8E8E93";

              const placeholder = block.type === "title" ? "Title" : block.type === "heading" ? "Heading" : block.type === "subheading" ? "Subheading" : isTodo ? "To-do" : isBullet || isNumbered ? "List item" : index === 0 ? "Note" : "";

              return (
                <View
                  key={block.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: block.type === "title" ? 6 : block.type === "heading" ? 4 : block.type === "subheading" ? 2 : 0,
                    minHeight: 20,
                  }}
                >
                  {isTodo && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleToggleCheckbox(block.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginRight: 8, marginTop: 1 }}
                    >
                      <Ionicons name={block.checked ? "checkmark-circle" : "ellipse-outline"} size={19} color={block.checked ? "#E5A93C" : "#C7C7CC"} />
                    </TouchableOpacity>
                  )}
                  {isBullet && (
                    <Text
                      allowFontScaling={false}
                      style={{
                        color: "#E5A93C",
                        fontSize: 18,
                        lineHeight: fontStyle.lineHeight || 20,
                        includeFontPadding: false,
                        width: 16,
                        textAlign: "center",
                        marginRight: 8,
                      }}
                    >
                      •
                    </Text>
                  )}
                  {isNumbered && (
                    <Text
                      allowFontScaling={false}
                      style={{
                        color: "#E5A93C",
                        fontFamily: "Outfit_700Bold",
                        fontSize: 15,
                        lineHeight: fontStyle.lineHeight || 20,
                        includeFontPadding: false,
                        minWidth: 20,
                        marginRight: 6,
                      }}
                    >
                      {currentNum}.
                    </Text>
                  )}

                  {inEditMode ? (
                    <TextInput
                      ref={(el) => {
                        inputRefs.current[block.id] = el;
                        if (el && pendingFocusRef.current === block.id) {
                          pendingFocusRef.current = null;
                          el.focus();
                        }
                      }}
                      value={block.text}
                      onFocus={() => { setIsEditing(true); setActiveBlockIndex(index); }}
                      onChangeText={(val) => handleBlockChangeText(block.id, index, val)}
                      onKeyPress={(e) => handleKeyPress(index, e)}
                      placeholder={placeholder}
                      placeholderTextColor="#C7C7CC"
                      multiline={true}
                      blurOnSubmit={false}
                      allowFontScaling={false}
                      style={[
                        {
                          flex: 1,
                          paddingVertical: 0,
                          paddingHorizontal: 0,
                          paddingTop: 0,
                          paddingBottom: 0,
                          margin: 0,
                          textAlignVertical: "top",
                          includeFontPadding: false,
                        },
                        fontStyle,
                      ]}
                    />
                  ) : (
                    <Pressable
                      onPress={() => {
                        setIsEditing(true);
                        setActiveBlockIndex(index);
                        requestAnimationFrame(() => inputRefs.current[block.id]?.focus());
                      }}
                      style={{ flex: 1, paddingVertical: 0 }}
                    >
                      {block.text.trim() === "" ? (
                        <Text allowFontScaling={false} style={[fontStyle, { color: "#C7C7CC" }]}>{placeholder}</Text>
                      ) : (
                        <Text allowFontScaling={false} style={fontStyle}>{renderInlineContent(block.text, fontStyle)}</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })}
            <Pressable style={{ flex: 1, minHeight: 200 }} onPress={handleCanvasPress} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showFormatSheet ? (
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
            paddingBottom: Math.max(insets.bottom + 12, 24),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Text allowFontScaling={false} style={{ fontFamily: "Outfit_700Bold", fontSize: 18, color: "#111111" }}>Format</Text>
            <TouchableOpacity activeOpacity={0.65} onPress={() => setShowFormatSheet(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#EFEFF4", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

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
                  onPress={() => handleSelectTextStyle(styleName)}
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

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F2F2F7", borderRadius: 16, padding: 3, flex: 1, marginRight: 8, height: 44 }}>
              {[
                { type: "bold", label: "B", style: { fontFamily: "Outfit_700Bold" } },
                { type: "italic", label: "I", style: { fontFamily: "Outfit_600SemiBold", fontStyle: "italic" as const } },
                { type: "underline", label: "U", style: { fontFamily: "Outfit_600SemiBold", textDecorationLine: "underline" as const } },
                { type: "strikethrough", label: "S", style: { fontFamily: "Outfit_600SemiBold", textDecorationLine: "line-through" as const } },
              ].map(({ type, label, style }) => {
                const isActive = !!activeFormats[type];
                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.65}
                    onPress={() => handleApplyFormat(type)}
                    style={{
                      flex: 1,
                      height: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 13,
                      backgroundColor: isActive ? "#FFFFFF" : "transparent",
                    }}
                  >
                    <Text allowFontScaling={false} style={[{ fontSize: 16, color: isActive ? "#E5A93C" : "#1C1C1E" }, style]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity activeOpacity={0.65} onPress={() => handleApplyFormat("marker")} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
              <Ionicons name="pencil" size={18} color="#1C1C1E" />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.65} onPress={() => handleApplyFormat("color")} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#007AFF" }} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F2F2F7", borderRadius: 16, padding: 3, flex: 1.3, marginRight: 8, height: 44 }}>
              {[
                { type: "bullet", icon: <Ionicons name="list" size={19} color="#1C1C1E" /> },
                { type: "dash", icon: <Ionicons name="remove-outline" size={20} color="#1C1C1E" /> },
                { type: "numbered", icon: <Text allowFontScaling={false} style={{ fontFamily: "Outfit_700Bold", fontSize: 13, color: "#1C1C1E" }}>1.</Text> },
              ].map(({ type, icon }) => (
                <TouchableOpacity key={type} activeOpacity={0.65} onPress={() => handleApplyFormat(type)} style={{ flex: 1, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13 }}>
                  {icon}
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F2F2F7", borderRadius: 16, padding: 3, flex: 0.9, height: 44 }}>
              {[
                { type: "outdent", icon: "arrow-back" as const },
                { type: "indent", icon: "arrow-forward" as const },
              ].map(({ type, icon }) => (
                <TouchableOpacity key={type} activeOpacity={0.65} onPress={() => handleApplyFormat(type)} style={{ flex: 1, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13 }}>
                  <Ionicons name={icon} size={17} color="#1C1C1E" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            bottom: keyboardHeight > 0 ? keyboardHeight + (Platform.OS === "android" ? 44 : 34) : Math.max(insets.bottom + 22, 32),
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
              onPress={handleInsertChecklist}
              style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#1C1C1E" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.65}
              onPress={handleInsertAttachment}
              style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="images-outline" size={21} color="#1C1C1E" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                Keyboard.dismiss();
                setShowFormatSheet((prev) => !prev);
              }}
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
            onPress={handleNewNote}
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
      )}

      <IosDialog
        visible={activeDialog === "delete"}
        title="Delete Note"
        message={`Are you sure you want to delete "${title.trim() || "New Note"}"? This cannot be undone.`}
        actions={[
          { text: "Cancel", style: "cancel", onPress: () => setActiveDialog(null) },
          { text: "Delete", style: "destructive", bold: true, onPress: () => { setActiveDialog(null); handleDeleteConfirmed(); } },
        ]}
        onClose={() => setActiveDialog(null)}
      />

      <IosDialog
        visible={activeDialog === "more"}
        title={title.trim() || "Note Options"}
        actions={[
          {
            text: isPinned ? "Unpin Note" : "Pin Note",
            onPress: () => {
              setIsPinned((prev) => {
                const next = !prev;
                isPinnedRef.current = next;
                hasUnsavedChanges.current = true;
                return next;
              });
              setActiveDialog(null);
            },
          },
          { text: "Delete Note", style: "destructive", onPress: () => setActiveDialog("delete") },
          { text: "Cancel", style: "cancel", onPress: () => setActiveDialog(null) },
        ]}
        onClose={() => setActiveDialog(null)}
      />

      <IosDialog
        visible={activeDialog === "unsaved"}
        title="Unsaved Changes"
        message="You have unsaved changes. Do you want to save or discard them?"
        actions={[
          { text: "Save", bold: true, onPress: () => { setActiveDialog(null); handleSaveAndExit(); } },
          { text: "Discard", style: "destructive", onPress: () => { setActiveDialog(null); router.back(); } },
          { text: "Cancel", style: "cancel", onPress: () => setActiveDialog(null) },
        ]}
        onClose={() => setActiveDialog(null)}
      />
    </SafeAreaView>
  );
}
