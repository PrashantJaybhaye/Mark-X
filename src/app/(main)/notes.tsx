import React, { useState, useMemo } from "react";
import { View, ScrollView, useWindowDimensions, Platform, StatusBar as RNStatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";

import { NotesHeader, NoteViewMode } from "../../components/notes/NotesHeader";
import { NotesStackedBanner } from "../../components/notes/NotesStackedBanner";
import { NoteItemCard, NoteItem } from "../../components/notes/NoteItemCard";
import { NotesEmptyState } from "../../components/notes/NotesEmptyState";
import { triggerHaptic } from "../../utils/haptics";
import { loadNotes, saveNotes } from "../../services/storageService";
import { pullAndMergeNotesFromFirestore, deleteNoteFromFirestore, syncNoteToFirestore } from "../../services/notesSyncService";
import { IosDialog } from "../../components/common/IosDialog";

export default function NotesScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<NoteViewMode>("grid");
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [activeDialog, setActiveDialog] = useState<"more" | "delete" | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }

      // 1. Instantly show local notes (zero latency)
      loadNotes().then((local) => setNotes(local ?? []));

      // 2. Pull from Firestore in background and merge (cross-device sync)
      pullAndMergeNotesFromFirestore().then((merged) => {
        if (merged) setNotes(merged);
      });
    }, [])
  );

  const updateNotesAndPersist = (updater: (prev: NoteItem[]) => NoteItem[]) => {
    setNotes((prev) => {
      const updated = updater(prev);
      saveNotes(updated);
      return updated;
    });
  };

  // 2-Column spacing (20px outer margin on each side, 12px gutter between columns)
  const columnWidth = (windowWidth - 40 - 12) / 2;

  const handleToggleViewMode = () => {
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  };

  const handleAddNote = () => {
    triggerHaptic();
    router.push({
      pathname: "/note/[id]",
      params: { id: "new" },
    });
  };

  const handleEditNote = React.useCallback((note: NoteItem) => {
    triggerHaptic();
    router.push({
      pathname: "/note/[id]",
      params: { id: note.id },
    });
  }, [router]);

  const handleOptionsPress = React.useCallback((note: NoteItem) => {
    triggerHaptic();
    setSelectedNote(note);
    setActiveDialog("more");
  }, []);

  const handleDeleteConfirmed = React.useCallback(() => {
    if (!selectedNote) return;
    triggerHaptic();
    updateNotesAndPersist((prev) => prev.filter((n) => n.id !== selectedNote.id));
    deleteNoteFromFirestore(selectedNote.id);
    setSelectedNote(null);
    setActiveDialog(null);
  }, [selectedNote]);

  const handleTogglePin = React.useCallback(() => {
    if (!selectedNote) return;
    triggerHaptic();
    const updatedNote = { ...selectedNote, isPinned: !selectedNote.isPinned };
    updateNotesAndPersist((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
    syncNoteToFirestore(updatedNote);
    setSelectedNote(null);
    setActiveDialog(null);
  }, [selectedNote]);

  // Filter notes by search query if user searches
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  // Distribute notes into two columns for grid masonry (pinned items first)
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned));
  }, [filteredNotes]);

  const leftColumnNotes = sortedNotes.filter((_, i) => i % 2 === 0);
  const rightColumnNotes = sortedNotes.filter((_, i) => i % 2 !== 0);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />


      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Top Header Bar */}
        <NotesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          onAddNote={handleAddNote}
        />

        {/* Scrollable Content Body */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 100,
          }}
        >
          {/* 1. Stacked Cards Banner */}
          <NotesStackedBanner notes={notes} onPress={handleAddNote} onNotePress={handleEditNote} />

          {/* 2. Bottom Notes Area (Grid & List View Modes) */}
          <View className="px-5 pt-1">
            {filteredNotes.length === 0 ? (
              <NotesEmptyState
                searchQuery={searchQuery}
                viewMode={viewMode}
                columnWidth={columnWidth}
                onClearSearch={() => setSearchQuery("")}
                onCreateNote={handleAddNote}
              />
            ) : viewMode === "grid" ? (
              <View className="flex-row justify-between w-full">
                {[leftColumnNotes, rightColumnNotes].map((col, i) => (
                  <View key={i} style={{ width: columnWidth }}>
                    {col.map((note) => (
                      <NoteItemCard key={note.id} note={note} viewMode="grid" onPress={handleEditNote} onOptionsPress={handleOptionsPress} />
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <View className="w-full">
                {filteredNotes.map((note) => (
                  <NoteItemCard key={note.id} note={note} viewMode="list" onPress={handleEditNote} onOptionsPress={handleOptionsPress} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <IosDialog
        visible={activeDialog === "delete"}
        title="Delete Note"
        message={`Are you sure you want to delete "${selectedNote?.title || "this note"}"? This cannot be undone.`}
        actions={[
          { text: "Cancel", style: "cancel", onPress: () => setActiveDialog(null) },
          { text: "Delete", style: "destructive", bold: true, onPress: handleDeleteConfirmed },
        ]}
        onClose={() => setActiveDialog(null)}
      />

      <IosDialog
        visible={activeDialog === "more"}
        title={selectedNote?.title || "Note Options"}
        actions={[
          {
            text: selectedNote?.isPinned ? "Unpin Note" : "Pin Note",
            onPress: handleTogglePin,
          },
          { text: "Delete Note", style: "destructive", onPress: () => setActiveDialog("delete") },
          { text: "Cancel", style: "cancel", onPress: () => setActiveDialog(null) },
        ]}
        onClose={() => setActiveDialog(null)}
      />
    </View>
  );
}
