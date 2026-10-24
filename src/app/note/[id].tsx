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
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { IosDialog } from "../../components/common/IosDialog";
import {
  NoteBottomBar,
  NoteEditorHeader,
  NoteFormatSheet,
} from "../../components/notes";
import {
  deleteNoteFromFirestore,
  syncNoteToFirestore,
} from "../../services/notesSyncService";
import {
  deleteNoteById,
  getNoteById,
  saveSingleNote,
} from "../../services/storageService";
import { triggerHaptic } from "../../utils/haptics";
import {
  BlockType,
  cleanLinesToMarkdown,
  getActiveFormatsAtSelection,
  NoteLine,
  parseMarkdownToLines,
  reconcileEditorLines,
  renderCleanEditorLines,
  toggleInlineFormatInLines,
} from "../../utils/noteMarkdown";

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
      const currentSel = { ...activeSelectionRef.current };
      if (currentSel.start !== currentSel.end) {
        const timer = setTimeout(() => {
          bodyInputRef.current?.setSelection(currentSel.start, currentSel.end);
        }, 80);
        return () => clearTimeout(timer);
      }
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

  const getActiveLineIndex = useCallback((selPos: number): number => {
    const { activeLineIdx } = getActiveFormatsAtSelection(
      latestLinesRef.current,
      selPos,
      selPos
    );
    return activeLineIdx;
  }, []);

  const checkActiveFormats = useCallback((sel: { start: number; end: number }) => {
    const { styleName, activeFormats: nextFormats } = getActiveFormatsAtSelection(
      latestLinesRef.current,
      sel.start,
      sel.end
    );
    setSelectedTextStyle(styleName);
    setActiveFormats(nextFormats);
  }, []);

  const applyInlineFormat = (type: "bold" | "italic" | "underline" | "strikethrough") => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    historyRef.current.push({ title: latestTitleRef.current, body: latestBodyRef.current });

    const selStart = Math.min(activeSelectionRef.current.start, activeSelectionRef.current.end);
    const selEnd = Math.max(activeSelectionRef.current.start, activeSelectionRef.current.end);

    const { updatedLines, newSelStart, newSelEnd } = toggleInlineFormatInLines(
      latestLinesRef.current,
      selStart,
      selEnd,
      type
    );

    setLines(updatedLines);
    latestLinesRef.current = updatedLines;
    const newBody = cleanLinesToMarkdown(updatedLines);
    latestBodyRef.current = newBody;
    hasUnsavedChanges.current = true;

    activeSelectionRef.current = { start: newSelStart, end: newSelEnd };
    checkActiveFormats({ start: newSelStart, end: newSelEnd });
    setTimeout(() => {
      bodyInputRef.current?.setSelection(newSelStart, newSelEnd);
    }, 25);
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

    const currentLines = currentBody.slice(firstLineStart, lastLineEnd).split("\n");
    const newLines = currentLines.map((line) => {
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

      {/* Modular Header */}
      <NoteEditorHeader
        onBack={handleBack}
        onUndo={handleUndo}
        onShare={handleShare}
        onMore={() => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
          setActiveDialog("more");
        }}
        inEditMode={inEditMode}
        onFinishEditing={handleFinishEditing}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom:
              keyboardHeight > 0
                ? keyboardHeight + (Platform.OS === "android" ? 140 : 110)
                : showFormatSheet
                ? 280
                : 160,
            flexGrow: 1,
          }}
        >
          {/* Permanent Title TextInput */}
          <Pressable
            disabled={inEditMode}
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
                setIsEditing(true);
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

          {/* Permanent Body TextInput */}
          <View style={{ minHeight: 320 }}>
            <Pressable
              disabled={inEditMode}
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
                  setIsEditing(true);
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

            {/* Tap-below empty area to focus */}
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

      {/* Modular Format Sheet & Bottom Bar */}
      {showFormatSheet ? (
        <NoteFormatSheet
          visible={showFormatSheet}
          bottomInset={insets.bottom}
          selectedTextStyle={selectedTextStyle}
          activeFormats={activeFormats}
          onClose={() => setShowFormatSheet(false)}
          onSelectTextStyle={handleSelectTextStyle}
          onApplyFormat={handleApplyFormat}
        />
      ) : (
        <NoteBottomBar
          keyboardHeight={keyboardHeight}
          bottomInset={insets.bottom}
          onInsertChecklist={handleInsertChecklist}
          onInsertAttachment={handleInsertAttachment}
          onToggleFormatSheet={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            const currentSel = { ...activeSelectionRef.current };
            checkActiveFormats(currentSel);
            setShowFormatSheet((prev) => !prev);
          }}
          onNewNote={handleNewNote}
        />
      )}

      {/* Native-styled iOS Dialogs */}
      <IosDialog
        visible={activeDialog === "delete"}
        title="Delete Note"
        message={`Are you sure you want to delete "${title.trim() || "New Note"}"? This cannot be undone.`}
        actions={[
          { text: "Cancel", style: "cancel", onPress: () => setActiveDialog(null) },
          {
            text: "Delete",
            style: "destructive",
            bold: true,
            onPress: () => {
              setActiveDialog(null);
              handleDeleteConfirmed();
            },
          },
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
