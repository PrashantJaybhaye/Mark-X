import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  ScrollView,
  Share,
  Text,
  TextInput,
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
  title: { fontFamily: "Outfit_700Bold", fontSize: 24, lineHeight: 30, color: "#111111", includeFontPadding: false },
  heading: { fontFamily: "Outfit_700Bold", fontSize: 20, lineHeight: 26, color: "#1C1C1E", includeFontPadding: false },
  subheading: { fontFamily: "Outfit_600SemiBold", fontSize: 17, lineHeight: 23, color: "#27272A", includeFontPadding: false },
  paragraph: { fontFamily: "Outfit_400Regular", fontSize: 16, lineHeight: 24, color: "#27272A", includeFontPadding: false },
};

export type BlockType = "paragraph" | "title" | "heading" | "subheading" | "todo" | "bullet" | "numbered";

export interface FormatRange {
  type: "bold" | "italic" | "underline" | "strikethrough";
  start: number;
  length: number;
}

function parseFormattedText(rawText: string) {
  let text = "";
  const formats: FormatRange[] = [];
  const parts = rawText.split(/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|<u>[^<]+<\/u>)/g);

  for (const part of parts) {
    if (!part) continue;
    let type: "bold" | "italic" | "underline" | "strikethrough" | null = null;
    let content = part;

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      type = "bold";
      content = part.slice(2, -2);
    } else if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      type = "strikethrough";
      content = part.slice(2, -2);
    } else if (part.startsWith("<u>") && part.endsWith("</u>") && part.length >= 7) {
      type = "underline";
      content = part.slice(3, -4);
    } else if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      type = "italic";
      content = part.slice(1, -1);
    }

    if (type) {
      formats.push({ type, start: text.length, length: content.length });
    }
    text += content;
  }

  return { text, formats };
}

function splitIntoFormattedChunks(text: string, formats?: FormatRange[]) {
  if (!formats || formats.length === 0) {
    return text ? [{ text, formats: new Set<string>() }] : [];
  }

  const charFormats = Array.from({ length: text.length }, () => new Set<string>());
  for (const f of formats) {
    for (let i = f.start; i < Math.min(f.start + f.length, text.length); i++) {
      charFormats[i].add(f.type);
    }
  }

  const chunks: { text: string; formats: Set<string> }[] = [];
  let currentText = "";
  let currentFormats = new Set<string>();

  for (let i = 0; i <= text.length; i++) {
    const formatsAtI = i < text.length ? charFormats[i] : new Set<string>();

    let changed = false;
    if (formatsAtI.size !== currentFormats.size) {
      changed = true;
    } else {
      for (const f of currentFormats) {
        if (!formatsAtI.has(f)) {
          changed = true;
          break;
        }
      }
    }

    if (changed || i === text.length) {
      if (currentText.length > 0) chunks.push({ text: currentText, formats: currentFormats });
      if (i < text.length) {
        currentText = text[i];
        currentFormats = formatsAtI;
      }
    } else {
      if (i < text.length) currentText += text[i];
    }
  }

  return chunks;
}

function renderRichText(text: string, formats: FormatRange[], baseStyle: any) {
  if (!formats || formats.length === 0) return text;

  const chunks = splitIntoFormattedChunks(text, formats);
  return chunks.map((chunk, i) => {
    const style: any = { ...baseStyle };
    if (chunk.formats.has("bold")) {
      style.fontFamily = "Outfit_700Bold";
      style.fontWeight = "bold";
    }
    if (chunk.formats.has("italic")) style.fontStyle = "italic";
    const decs = [];
    if (chunk.formats.has("underline")) decs.push("underline");
    if (chunk.formats.has("strikethrough")) decs.push("line-through");
    if (decs.length > 0) style.textDecorationLine = decs.join(" ");
    return (
      <Text allowFontScaling={false} key={i} style={style}>
        {chunk.text}
      </Text>
    );
  });
}

function renderFormattedBody(
  bodyText: string,
  onToggleCheckbox: (lineIdx: number) => void
) {
  const lines = bodyText.split("\n");
  let numberedCount = 1;

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    let blockType: BlockType = "paragraph";
    let content = line;
    let checked: boolean | undefined = undefined;

    if (trimmed.startsWith("# ")) {
      blockType = "title";
      content = line.slice(line.indexOf("# ") + 2);
      numberedCount = 1;
    } else if (trimmed.startsWith("## ")) {
      blockType = "heading";
      content = line.slice(line.indexOf("## ") + 3);
      numberedCount = 1;
    } else if (trimmed.startsWith("### ")) {
      blockType = "subheading";
      content = line.slice(line.indexOf("### ") + 4);
      numberedCount = 1;
    } else {
      const todoMatch = line.match(/^(\s*)([•\-\*–—]\s*)?\[([ xX])\]\s*(.*)$/);
      if (todoMatch) {
        blockType = "todo";
        content = todoMatch[4];
        checked = todoMatch[3].toLowerCase() === "x";
        numberedCount = 1;
      } else {
        const bulletMatch = line.match(/^(\s*)[•\-\*–—]\s+(.*)$/);
        if (bulletMatch) {
          blockType = "bullet";
          content = bulletMatch[2];
          numberedCount = 1;
        } else {
          const numMatch = line.match(/^(\s*)\d+[\.\)]\s+(.*)$/);
          if (numMatch) {
            blockType = "numbered";
            content = numMatch[2];
          } else {
            numberedCount = 1;
          }
        }
      }
    }

    const isTodo = blockType === "todo";
    const isBullet = blockType === "bullet";
    const isNumbered = blockType === "numbered";
    const currentNum = isNumbered ? numberedCount++ : 1;

    const fontStyle: any = { ...(BLOCK_TYPOGRAPHY[blockType] || BLOCK_TYPOGRAPHY.paragraph) };
    if (isTodo && checked) {
      fontStyle.textDecorationLine = "line-through";
      fontStyle.color = "#8E8E93";
    }

    const { text, formats } = parseFormattedText(content);

    return (
      <View
        key={`line-${idx}`}
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: blockType === "title" ? 6 : blockType === "heading" ? 4 : blockType === "subheading" ? 3 : line === "" ? 4 : 2,
          minHeight: line === "" ? 10 : 22,
        }}
      >
        {isTodo && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onToggleCheckbox(idx)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 8, marginTop: 2 }}
          >
            <Ionicons
              name={checked ? "checkmark-circle" : "ellipse-outline"}
              size={19}
              color={checked ? "#E5A93C" : "#C7C7CC"}
            />
          </TouchableOpacity>
        )}
        {isBullet && (
          <Text
            allowFontScaling={false}
            style={{
              color: "#E5A93C",
              fontSize: 18,
              lineHeight: fontStyle.lineHeight || 24,
              includeFontPadding: false,
              width: 16,
              textAlign: "center",
              marginRight: 6,
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
              lineHeight: fontStyle.lineHeight || 24,
              includeFontPadding: false,
              minWidth: 20,
              marginRight: 6,
            }}
          >
            {currentNum}.
          </Text>
        )}
        <Text allowFontScaling={false} style={[{ flex: 1 }, fontStyle]}>
          {line.trim() === "" ? " " : renderRichText(text, formats, fontStyle)}
        </Text>
      </View>
    );
  });
}

export interface NoteLine {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
}

export function parseMarkdownToLines(raw: string): NoteLine[] {
  if (!raw) return [{ id: `l-${Date.now()}-0`, type: "paragraph", text: "" }];
  return raw.split("\n").map((line, idx) => {
    const id = `l-${Date.now()}-${idx}`;
    const trimmed = line.trim();
    let type: BlockType = "paragraph";
    let text = line;
    let checked: boolean | undefined = undefined;

    if (trimmed.startsWith("# ")) {
      type = "title";
      text = line.slice(line.indexOf("# ") + 2);
    } else if (trimmed.startsWith("## ")) {
      type = "heading";
      text = line.slice(line.indexOf("## ") + 3);
    } else if (trimmed.startsWith("### ")) {
      type = "subheading";
      text = line.slice(line.indexOf("### ") + 4);
    } else {
      const todoMatch = line.match(/^(\s*)([•\-\*–—]\s*)?\[([ xX])\]\s*(.*)$/);
      if (todoMatch) {
        type = "todo";
        text = todoMatch[4];
        checked = todoMatch[3].toLowerCase() === "x";
      } else {
        const bulletMatch = line.match(/^(\s*)[•\-\*–—]\s+(.*)$/);
        if (bulletMatch) {
          type = "bullet";
          text = bulletMatch[2];
        } else {
          const numMatch = line.match(/^(\s*)\d+[\.\)]\s+(.*)$/);
          if (numMatch) {
            type = "numbered";
            text = numMatch[2];
          }
        }
      }
    }

    return { id, type, text, checked };
  });
}

export function cleanLinesToMarkdown(lines: NoteLine[]): string {
  return lines
    .map((l, idx) => {
      if (l.type === "title") return `# ${l.text}`;
      if (l.type === "heading") return `## ${l.text}`;
      if (l.type === "subheading") return `### ${l.text}`;
      if (l.type === "todo") return `[${l.checked ? "x" : " "}] ${l.text}`;
      if (l.type === "bullet") return `• ${l.text}`;
      if (l.type === "numbered") return `${idx + 1}. ${l.text}`;
      return l.text;
    })
    .join("\n");
}

export function getLinePrefix(line: NoteLine, idx: number): string {
  if (line.type === "todo") return line.checked ? "☑ " : "☐ ";
  if (line.type === "bullet") return "• ";
  if (line.type === "numbered") return `${idx + 1}. `;
  return "";
}

export function parseLinePrefix(raw: string): { cleanText: string; isTodo: boolean; checked: boolean; isBullet: boolean; isNumbered: boolean } {
  if (raw.startsWith("☑ ")) {
    return { cleanText: raw.slice(2), isTodo: true, checked: true, isBullet: false, isNumbered: false };
  }
  if (raw.startsWith("☐ ")) {
    return { cleanText: raw.slice(2), isTodo: true, checked: false, isBullet: false, isNumbered: false };
  }
  if (raw.startsWith("• ")) {
    return { cleanText: raw.slice(2), isTodo: false, checked: false, isBullet: true, isNumbered: false };
  }
  const numMatch = raw.match(/^\d+\.\s+/);
  if (numMatch) {
    return { cleanText: raw.slice(numMatch[0].length), isTodo: false, checked: false, isBullet: false, isNumbered: true };
  }
  return { cleanText: raw, isTodo: false, checked: false, isBullet: false, isNumbered: false };
}

function reconcileEditorLines(newRawLines: string[], prevLines: NoteLine[]): NoteLine[] {
  if (newRawLines.length === prevLines.length) {
    return prevLines.map((prev, i) => {
      const p = parseLinePrefix(newRawLines[i] ?? "");
      let type = prev.type;
      let checked = prev.checked;
      if (p.isTodo) {
        type = "todo";
        checked = p.checked;
      } else if (p.isBullet) {
        type = "bullet";
      } else if (p.isNumbered) {
        type = "numbered";
      } else if (prev.type === "todo" || prev.type === "bullet" || prev.type === "numbered") {
        type = "paragraph";
        checked = false;
      }
      return {
        ...prev,
        type,
        checked,
        text: p.cleanText,
      };
    });
  }

  if (newRawLines.length > prevLines.length) {
    const diff = newRawLines.length - prevLines.length;
    let splitIdx = 0;
    while (
      splitIdx < prevLines.length &&
      parseLinePrefix(newRawLines[splitIdx] ?? "").cleanText === prevLines[splitIdx]?.text
    ) {
      splitIdx++;
    }

    const prevAtSplit = prevLines[splitIdx];
    const inheritType: BlockType =
      prevAtSplit?.type === "todo" && prevAtSplit.text.trim().length > 0
        ? "todo"
        : prevAtSplit?.type === "bullet"
        ? "bullet"
        : "paragraph";

    const result: NoteLine[] = [];
    for (let i = 0; i < splitIdx; i++) {
      result.push(prevLines[i]);
    }

    const p0 = parseLinePrefix(newRawLines[splitIdx] ?? "");
    result.push({
      ...(prevLines[splitIdx] || { id: `l-${Date.now()}-${splitIdx}`, type: "paragraph" }),
      text: p0.cleanText,
    });

    for (let i = 1; i <= diff; i++) {
      const pNew = parseLinePrefix(newRawLines[splitIdx + i] ?? "");
      result.push({
        id: `l-${Date.now()}-${splitIdx + i}`,
        type: pNew.isTodo ? "todo" : pNew.isBullet ? "bullet" : inheritType,
        text: pNew.cleanText,
        checked: pNew.checked || false,
      });
    }

    for (let i = splitIdx + 1; i < prevLines.length; i++) {
      const pRem = parseLinePrefix(newRawLines[i + diff] ?? "");
      result.push({
        ...prevLines[i],
        text: pRem.cleanText,
      });
    }

    return result;
  }

  const diff = prevLines.length - newRawLines.length;
  let delIdx = 0;
  while (
    delIdx < newRawLines.length &&
    parseLinePrefix(newRawLines[delIdx] ?? "").cleanText === prevLines[delIdx]?.text
  ) {
    delIdx++;
  }

  const result: NoteLine[] = [];
  for (let i = 0; i < delIdx; i++) {
    result.push(prevLines[i]);
  }

  for (let i = delIdx; i < newRawLines.length; i++) {
    const old = prevLines[i + diff] || prevLines[i] || { id: `l-${Date.now()}-${i}`, type: "paragraph" as BlockType };
    const p = parseLinePrefix(newRawLines[i] ?? "");
    result.push({
      id: old.id || `l-${Date.now()}-${i}`,
      type: p.isTodo ? "todo" : p.isBullet ? "bullet" : p.isNumbered ? "numbered" : old.type || "paragraph",
      text: p.cleanText,
      checked: p.checked !== undefined ? p.checked : old.checked,
    });
  }

  return result;
}

function renderCleanEditorLines(lines: NoteLine[]) {
  if (!lines || lines.length === 0) return null;
  const total = lines.length;

  return lines.map((line, idx) => {
    const isLast = idx === total - 1;
    const fontStyle = BLOCK_TYPOGRAPHY[line.type] || BLOCK_TYPOGRAPHY.paragraph;

    let prefix = "";
    if (line.type === "todo") {
      prefix = line.checked ? "☑ " : "☐ ";
    } else if (line.type === "bullet") {
      prefix = "• ";
    } else if (line.type === "numbered") {
      prefix = `${idx + 1}. `;
    }

    const { text: cleanText, formats } = parseFormattedText(line.text);

    return (
      <Text key={line.id} style={fontStyle}>
        {prefix !== "" && (
          <Text style={{ color: "#E5A93C", fontFamily: "Outfit_700Bold", fontSize: fontStyle.fontSize }}>
            {prefix}
          </Text>
        )}
        {line.type === "todo" && line.checked ? (
          <Text style={{ textDecorationLine: "line-through", color: "#8E8E93" }}>
            {cleanText}
          </Text>
        ) : (
          renderRichText(cleanText, formats, fontStyle)
        )}
        {!isLast && "\n"}
      </Text>
    );
  });
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
  const [lines, setLines] = useState<NoteLine[]>(() => parseMarkdownToLines(""));

  const bodyInputRef = useRef<TextInput | null>(null);
  const titleInputRef = useRef<TextInput | null>(null);

  const [isPinned, setIsPinned] = useState(false);
  const [createdAt, setCreatedAt] = useState("");

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isEditing, setIsEditing] = useState(isNewNote);
  const [showFormatSheet, setShowFormatSheet] = useState(false);
  const [selectedTextStyle, setSelectedTextStyle] = useState("Body");
  const [activeFormats, setActiveFormats] = useState<{ [key: string]: boolean }>({});
  const activeSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const [activeDialog, setActiveDialog] = useState<"delete" | "more" | "unsaved" | null>(null);

  const historyRef = useRef<{ title: string; body: string }[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const latestLinesRef = useRef<NoteLine[]>(lines);
  latestLinesRef.current = lines;
  const latestBodyRef = useRef<string>(body);
  latestBodyRef.current = body;
  const latestTitleRef = useRef<string>(title);
  latestTitleRef.current = title;
  const isPinnedRef = useRef<boolean>(isPinned);
  isPinnedRef.current = isPinned;
  const isDeletedRef = useRef(false);
  const hasUnsavedChanges = useRef(false);

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
          const parsedLines = parseMarkdownToLines(raw);
          setLines(parsedLines);
          latestLinesRef.current = parsedLines;
          setBody(raw);
          latestTitleRef.current = note.title;
          latestBodyRef.current = raw;
          setIsPinned(note.isPinned ?? false);
          setCreatedAt(note.createdAt ?? "");
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [id, isNewNote]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (showFormatSheet) {
      Keyboard.dismiss();
    }
  }, [showFormatSheet]);

  const commitNote = useCallback(
    async (currentTitle: string, currentBody: string, currentPinned: boolean) => {
      const trimmedTitle = currentTitle.trim();
      const trimmedBody = currentBody.trim();
      if (!trimmedTitle && !trimmedBody) return;

      const resolvedTitle =
        trimmedTitle || (trimmedBody ? trimmedBody.split("\n")[0].trim().slice(0, 40) : "") || "New Note";
      const formattedDate = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const finalCreatedAt = createdAt || formattedDate;
      const nowMs = Date.now();
      await saveSingleNote({
        id: noteId,
        title: resolvedTitle,
        body: trimmedBody,
        isPinned: currentPinned,
        createdAt: finalCreatedAt,
        updatedAt: formattedDate,
        updatedAtMs: nowMs,
      });
      return { createdAt: finalCreatedAt, updatedAt: formattedDate, updatedAtMs: nowMs };
    },
    [noteId, createdAt]
  );

  useEffect(() => {
    const onHardwareBack = () => {
      if (activeDialog) {
        setActiveDialog(null);
        return true;
      }
      if (showFormatSheet) {
        setShowFormatSheet(false);
        return true;
      }
      if (hasUnsavedChanges.current) {
        Keyboard.dismiss();
        setActiveDialog("unsaved");
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
    return () => backSub.remove();
  }, [activeDialog, showFormatSheet]);

  const updateBodyAndSave = (nextBody: string) => {
    latestBodyRef.current = nextBody;
    const parsed = parseMarkdownToLines(nextBody);
    setLines(parsed);
    latestLinesRef.current = parsed;
    hasUnsavedChanges.current = true;
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
    const currentBody = cleanLinesToMarkdown(latestLinesRef.current);
    latestBodyRef.current = currentBody;
    const dates = await commitNote(latestTitleRef.current, currentBody, isPinnedRef.current);
    if (dates) {
      syncNoteToFirestore({
        id: noteId,
        title: latestTitleRef.current,
        body: currentBody,
        isPinned: isPinnedRef.current,
        createdAt: dates.createdAt,
        updatedAt: dates.updatedAt,
        updatedAtMs: dates.updatedAtMs,
      });
    }
    hasUnsavedChanges.current = false;
  };

  const handleTitleChange = (nextTitle: string) => {
    if (Math.abs(nextTitle.length - title.length) > 3) {
      historyRef.current.push({ title, body: latestBodyRef.current });
    }
    setTitle(nextTitle);
    latestTitleRef.current = nextTitle;
    hasUnsavedChanges.current = true;
  };

  const handleBodyChange = (nextText: string) => {
    if (Math.abs(nextText.length - (latestBodyRef.current?.length || 0)) > 5) {
      historyRef.current.push({ title: latestTitleRef.current, body: latestBodyRef.current });
    }
    const newRawLines = nextText.split("\n");
    const updatedLines = reconcileEditorLines(newRawLines, latestLinesRef.current);
    setLines(updatedLines);
    latestLinesRef.current = updatedLines;
    const md = cleanLinesToMarkdown(updatedLines);
    latestBodyRef.current = md;
    hasUnsavedChanges.current = true;
  };

  const handleUndo = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (historyRef.current.length > 0) {
      const prev = historyRef.current.pop()!;
      setTitle(prev.title);
      setBody(prev.body);
      const restored = parseMarkdownToLines(prev.body);
      setLines(restored);
      latestLinesRef.current = restored;
      latestTitleRef.current = prev.title;
      latestBodyRef.current = prev.body;
      hasUnsavedChanges.current = true;
    }
  };

  const handleShare = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const content = [title.trim(), body.trim()].filter(Boolean).join("\n\n");
    if (!content) return;
    try {
      await Share.share({ title: title || "Note", message: content });
    } catch {}
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

  const handleToggleCheckboxInBody = (lineIdx: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const currentLines = latestLinesRef.current;
    if (lineIdx >= 0 && lineIdx < currentLines.length) {
      const updated = currentLines.map((l, i) =>
        i === lineIdx ? { ...l, checked: !l.checked } : l
      );
      setLines(updated);
      latestLinesRef.current = updated;
      const newBody = cleanLinesToMarkdown(updated);
      updateBodyAndSave(newBody);
      commitNote(latestTitleRef.current, newBody, isPinnedRef.current).then((dates) => {
        if (dates) {
          syncNoteToFirestore({
            id: noteId,
            title: latestTitleRef.current,
            body: newBody,
            isPinned: isPinnedRef.current,
            createdAt: dates.createdAt,
            updatedAt: dates.updatedAt,
            updatedAtMs: dates.updatedAtMs,
          });
        }
      });
    }
  };

  const getActiveLineIndex = useCallback((selPos: number): number => {
    const currentLines = latestLinesRef.current;
    let charCount = 0;
    for (let i = 0; i < currentLines.length; i++) {
      const lineLen = getLinePrefix(currentLines[i], i).length + currentLines[i].text.length + 1;
      if (selPos >= charCount && selPos <= charCount + lineLen) {
        return i;
      }
      charCount += lineLen;
    }
    return Math.max(0, currentLines.length - 1);
  }, []);

  const checkActiveFormats = useCallback((sel: { start: number; end: number }) => {
    const currentLines = latestLinesRef.current;
    const pos = Math.min(sel.start, sel.end);
    const activeLineIdx = getActiveLineIndex(pos);
    const activeLine = currentLines[activeLineIdx];

    if (activeLine) {
      const styleName =
        activeLine.type === "title"
          ? "Title"
          : activeLine.type === "heading"
          ? "Heading"
          : activeLine.type === "subheading"
          ? "Subheading"
          : "Body";
      setSelectedTextStyle(styleName);

      const before = activeLine.text.slice(0, pos);
      const after = activeLine.text.slice(pos);
      const isBold = before.split("**").length % 2 === 0 && after.includes("**");
      const isItalic = before.split("*").length % 2 === 0 && after.includes("*");
      const isUnderline = before.split("<u>").length > before.split("</u>").length;
      const isStrike = before.split("~~").length % 2 === 0 && after.includes("~~");
      setActiveFormats({ bold: isBold, italic: isItalic, underline: isUnderline, strikethrough: isStrike });
    }
  }, [getActiveLineIndex]);

  const applyLinePrefix = (prefix: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    historyRef.current.push({ title: latestTitleRef.current, body: latestBodyRef.current });

    const currentBody = latestBodyRef.current;
    const selStart = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
    const selEnd = Math.max(activeSelectionRef.current.start, activeSelectionRef.current.end);

    const firstLineStart = currentBody.lastIndexOf("\n", Math.max(0, selStart - 1)) + 1;
    let lastLineEnd = currentBody.indexOf("\n", selEnd);
    if (lastLineEnd === -1) lastLineEnd = currentBody.length;

    const targetText = currentBody.slice(firstLineStart, lastLineEnd);
    const lines = targetText.split("\n");

    const newLines = lines.map((line) => {
      const clean = line.replace(/^(#+\s*|\[[ xX]\]\s*|[•\-\*]\s*|\d+[\.\)]\s*)/, "");
      if (!prefix) return clean;
      if (line.startsWith(prefix)) return clean;
      return `${prefix}${clean}`;
    });

    const replacement = newLines.join("\n");
    const newBody = currentBody.slice(0, firstLineStart) + replacement + currentBody.slice(lastLineEnd);
    updateBodyAndSave(newBody);
  };

  const applyInlineFormat = (type: "bold" | "italic" | "underline" | "strikethrough") => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    historyRef.current.push({ title: latestTitleRef.current, body: latestBodyRef.current });

    const currentBody = latestBodyRef.current;
    const selStart = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
    const selEnd = Math.max(activeSelectionRef.current.start, activeSelectionRef.current.end);

    const marker = type === "bold" ? "**" : type === "italic" ? "*" : type === "strikethrough" ? "~~" : "<u>";
    const closeMarker = type === "underline" ? "</u>" : marker;
    const mLen = marker.length;
    const cLen = closeMarker.length;

    if (selStart !== selEnd) {
      const selected = currentBody.slice(selStart, selEnd);
      let newBody: string;
      if (selected.startsWith(marker) && selected.endsWith(closeMarker) && selected.length >= mLen + cLen) {
        const unwrapped = selected.slice(mLen, -cLen);
        newBody = currentBody.slice(0, selStart) + unwrapped + currentBody.slice(selEnd);
      } else {
        newBody = currentBody.slice(0, selStart) + marker + selected + closeMarker + currentBody.slice(selEnd);
      }
      updateBodyAndSave(newBody);
    } else {
      const newBody = currentBody.slice(0, selStart) + marker + closeMarker + currentBody.slice(selStart);
      updateBodyAndSave(newBody);
      activeSelectionRef.current = { start: selStart + mLen, end: selStart + mLen };
      if (!showFormatSheet) {
        setTimeout(() => {
          bodyInputRef.current?.setSelection(selStart + mLen, selStart + mLen);
        }, 25);
      } else {
        Keyboard.dismiss();
      }
    }
  };

  const applyIndent = (isOutdent: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    historyRef.current.push({ title: latestTitleRef.current, body: latestBodyRef.current });

    const currentBody = latestBodyRef.current;
    const selStart = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
    const selEnd = Math.max(activeSelectionRef.current.start, activeSelectionRef.current.end);

    const firstLineStart = currentBody.lastIndexOf("\n", Math.max(0, selStart - 1)) + 1;
    let lastLineEnd = currentBody.indexOf("\n", selEnd);
    if (lastLineEnd === -1) lastLineEnd = currentBody.length;

    const lines = currentBody.slice(firstLineStart, lastLineEnd).split("\n");
    const newLines = lines.map((line) => {
      if (isOutdent) {
        if (line.startsWith("  ")) return line.slice(2);
        if (line.startsWith("\t")) return line.slice(1);
        return line;
      } else {
        return `  ${line}`;
      }
    });

    const newBody = currentBody.slice(0, firstLineStart) + newLines.join("\n") + currentBody.slice(lastLineEnd);
    updateBodyAndSave(newBody);
  };

  const handleInsertChecklist = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);

    const currentLines = latestLinesRef.current;
    const selPos = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
    const activeLineIdx = getActiveLineIndex(selPos);

    const updated = [...currentLines];
    const cur = updated[activeLineIdx];
    if (cur) {
      if (cur.type === "todo" && !cur.checked) {
        updated[activeLineIdx] = { ...cur, checked: true };
      } else if (cur.type === "todo" && cur.checked) {
        updated[activeLineIdx] = { ...cur, type: "paragraph", checked: false };
      } else {
        updated[activeLineIdx] = { ...cur, type: "todo", checked: false };
      }
      setLines(updated);
      latestLinesRef.current = updated;
      const md = cleanLinesToMarkdown(updated);
      updateBodyAndSave(md);
    }
  };

  const handleInsertAttachment = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    historyRef.current.push({ title: latestTitleRef.current, body: latestBodyRef.current });

    const currentBody = latestBodyRef.current;
    const pos = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
    const newBody = currentBody.slice(0, pos) + " 📎" + currentBody.slice(pos);
    updateBodyAndSave(newBody);
    setTimeout(() => {
      bodyInputRef.current?.setSelection(pos + 3, pos + 3);
    }, 25);
  };

  const handleNewNote = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    commitNote(title, body, isPinned);
    setNoteId(`note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    setTitle("");
    setBody("");
    const emptyLines = parseMarkdownToLines("");
    setLines(emptyLines);
    latestLinesRef.current = emptyLines;
    latestTitleRef.current = "";
    latestBodyRef.current = "";
    setIsPinned(false);
    setCreatedAt("");
    setIsEditing(true);
    setShowFormatSheet(false);
    hasUnsavedChanges.current = false;
  };

  const handleSelectTextStyle = (styleName: string) => {
    setSelectedTextStyle(styleName);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);

    const styleTypeMap: Record<string, BlockType> = {
      Title: "title",
      Heading: "heading",
      Subheading: "subheading",
      Body: "paragraph",
    };
    const targetType = styleTypeMap[styleName] ?? "paragraph";

    const currentLines = latestLinesRef.current;
    const selPos = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
    const activeLineIdx = getActiveLineIndex(selPos);

    const updated = [...currentLines];
    if (updated[activeLineIdx]) {
      updated[activeLineIdx] = {
        ...updated[activeLineIdx],
        type: targetType,
      };
      setLines(updated);
      latestLinesRef.current = updated;
      const md = cleanLinesToMarkdown(updated);
      updateBodyAndSave(md);
    }
  };

  const handleApplyFormat = (type: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);

    const currentLines = latestLinesRef.current;
    const selPos = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
    const activeLineIdx = getActiveLineIndex(selPos);

    if (type === "bullet" || type === "dash") {
      const updated = [...currentLines];
      if (updated[activeLineIdx]) {
        updated[activeLineIdx] = {
          ...updated[activeLineIdx],
          type: updated[activeLineIdx].type === "bullet" ? "paragraph" : "bullet",
        };
        setLines(updated);
        latestLinesRef.current = updated;
        const md = cleanLinesToMarkdown(updated);
        updateBodyAndSave(md);
      }
    } else if (type === "numbered") {
      const updated = [...currentLines];
      if (updated[activeLineIdx]) {
        updated[activeLineIdx] = {
          ...updated[activeLineIdx],
          type: updated[activeLineIdx].type === "numbered" ? "paragraph" : "numbered",
        };
        setLines(updated);
        latestLinesRef.current = updated;
        const md = cleanLinesToMarkdown(updated);
        updateBodyAndSave(md);
      }
    } else if (type === "outdent") {
      applyIndent(true);
    } else if (type === "indent") {
      applyIndent(false);
    } else if (["bold", "italic", "underline", "strikethrough"].includes(type)) {
      applyInlineFormat(type as any);
    } else if (type === "marker") {
      const pos = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
      const newBody = latestBodyRef.current.slice(0, pos) + "✍️ " + latestBodyRef.current.slice(pos);
      updateBodyAndSave(newBody);
    } else if (type === "color") {
      const pos = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
      const newBody = latestBodyRef.current.slice(0, pos) + "🔹 " + latestBodyRef.current.slice(pos);
      updateBodyAndSave(newBody);
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
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setActiveDialog("more");
              }}
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
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + (Platform.OS === "android" ? 140 : 110) : (showFormatSheet ? 280 : 160),
            flexGrow: 1,
          }}
        >
          <Pressable
            pointerEvents={inEditMode ? "box-none" : "auto"}
            onPress={() => {
              if (!inEditMode) {
                setIsEditing(true);
                setTimeout(() => titleInputRef.current?.focus(), 50);
              }
            }}
          >
            <TextInput
              ref={titleInputRef}
              value={title}
              editable={inEditMode}
              pointerEvents={inEditMode ? "auto" : "none"}
              showSoftInputOnFocus={!showFormatSheet}
              onFocus={() => {
                if (showFormatSheet) {
                  Keyboard.dismiss();
                } else {
                  setIsEditing(true);
                }
              }}
              onChangeText={handleTitleChange}
              placeholder="Title"
              placeholderTextColor="#C7C7CC"
              returnKeyType="next"
              onSubmitEditing={() => bodyInputRef.current?.focus()}
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
          </Pressable>

          <View style={{ minHeight: 320 }}>
            <Pressable
              style={{ minHeight: 300 }}
              pointerEvents={inEditMode ? "box-none" : "auto"}
              onPress={() => {
                if (!inEditMode) {
                  setIsEditing(true);
                  setTimeout(() => bodyInputRef.current?.focus(), 50);
                }
              }}
            >
              <TextInput
                ref={bodyInputRef}
                editable={inEditMode}
                pointerEvents={inEditMode ? "auto" : "none"}
                showSoftInputOnFocus={!showFormatSheet}
                onChangeText={handleBodyChange}
                onSelectionChange={(e) => {
                  activeSelectionRef.current = e.nativeEvent.selection;
                  if (showFormatSheet) {
                    checkActiveFormats(e.nativeEvent.selection);
                  }
                }}
                onFocus={() => {
                  if (showFormatSheet) {
                    Keyboard.dismiss();
                  } else {
                    setIsEditing(true);
                  }
                }}
                placeholder="Type your note here..."
                placeholderTextColor="#C7C7CC"
                multiline={true}
                scrollEnabled={false}
                allowFontScaling={false}
                style={{
                  fontFamily: "Outfit_400Regular",
                  fontSize: 16,
                  lineHeight: 24,
                  color: "#1C1C1E",
                  minHeight: 300,
                  paddingVertical: 0,
                  paddingHorizontal: 0,
                  textAlignVertical: "top",
                  includeFontPadding: false,
                }}
              >
                {renderCleanEditorLines(lines)}
              </TextInput>
            </Pressable>
            <Pressable
              style={{ flex: 1, minHeight: 120 }}
              onPress={() => {
                if (showFormatSheet) {
                  setShowFormatSheet(false);
                  return;
                }
                if (!inEditMode) {
                  setIsEditing(true);
                  setTimeout(() => bodyInputRef.current?.focus(), 50);
                }
              }}
            />
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
                checkActiveFormats(activeSelectionRef.current);
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
