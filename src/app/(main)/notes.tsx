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

export default function NotesScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<NoteViewMode>("grid");
  const [notes, setNotes] = useState<NoteItem[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle("dark");
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle("dark-content");
      }
      // Reload notes every time screen comes into focus (catches deletions/edits)
      loadNotes().then((stored) => setNotes(stored ?? []));
    }, [])
  );

  // Hydrate notes on mount
  React.useEffect(() => {
    let isMounted = true;
    loadNotes().then((stored) => {
      if (isMounted && stored.length > 0) {
        setNotes(stored);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleDeleteNote = React.useCallback((note: NoteItem) => {
    triggerHaptic();
    updateNotesAndPersist((prev) => prev.filter((n) => n.id !== note.id));
  }, []);

  // Filter notes by search query if user searches
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.body && n.body.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  // Distribute notes into two columns for grid masonry (pinned items first)
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
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
              /* --- Grid Mode (2-Column Masonry Layout) --- */
              <View className="flex-row justify-between w-full">
                {/* Left Column */}
                <View style={{ width: columnWidth }}>
                  {leftColumnNotes.map((note) => (
                    <NoteItemCard
                      key={note.id}
                      note={note}
                      viewMode="grid"
                      onPress={handleEditNote}
                      onOptionsPress={handleDeleteNote}
                    />
                  ))}
                </View>

                {/* Right Column */}
                <View style={{ width: columnWidth }}>
                  {rightColumnNotes.map((note) => (
                    <NoteItemCard
                      key={note.id}
                      note={note}
                      viewMode="grid"
                      onPress={handleEditNote}
                      onOptionsPress={handleDeleteNote}
                    />
                  ))}
                </View>
              </View>
            ) : (
              /* --- Row / Card List Mode --- */
              <View className="w-full">
                {filteredNotes.map((note) => (
                  <NoteItemCard
                    key={note.id}
                    note={note}
                    viewMode="list"
                    onPress={handleEditNote}
                    onOptionsPress={handleDeleteNote}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
