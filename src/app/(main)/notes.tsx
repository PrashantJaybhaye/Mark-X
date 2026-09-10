import React, { useState, useMemo } from "react";
import { View, ScrollView, useWindowDimensions, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { NotesHeader, NoteViewMode } from "../../components/notes/NotesHeader";
import { NotesStackedBanner } from "../../components/notes/NotesStackedBanner";
import { NoteItemCard, NoteItem } from "../../components/notes/NoteItemCard";
import { NotesEmptyState } from "../../components/notes/NotesEmptyState";
import { triggerHaptic } from "../../utils/haptics";

export default function NotesScreen() {
  const { height: screenHeight, width: windowWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<NoteViewMode>("grid");
  const [notes, setNotes] = useState<NoteItem[]>([]);

  // 2-Column spacing (20px outer margin on each side, 12px gutter between columns)
  const columnWidth = (windowWidth - 40 - 12) / 2;

  const handleToggleViewMode = () => {
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  };

  const handleAddNote = () => {
    triggerHaptic();
    // Step 2: Note creation / editor modal
  };

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

  // Distribute notes into two columns for grid masonry
  const leftColumnNotes = filteredNotes.filter((_, i) => i % 2 === 0);
  const rightColumnNotes = filteredNotes.filter((_, i) => i % 2 !== 0);

  return (
    <View className="flex-1 bg-[#F4F5F7]">
      <StatusBar style="dark" />

      {/* Top Ambient Atmospheric Glow (Mark-X Signature Glow) */}
      <Svg
        width="100%"
        height={screenHeight > 800 ? 560 : 490}
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FF8A5B" stopOpacity="0.92" />
            <Stop offset="20%" stopColor="#FF9B73" stopOpacity="0.75" />
            <Stop offset="45%" stopColor="#FFB69A" stopOpacity="0.5" />
            <Stop offset="70%" stopColor="#FFD8C7" stopOpacity="0.22" />
            <Stop offset="90%" stopColor="#F6F7F9" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#F4F5F7" stopOpacity="0" />
          </LinearGradient>

          <RadialGradient id="coreAmberGlow" cx="80%" cy="2%" rx="75%" ry="50%">
            <Stop offset="0%" stopColor="#FF7043" stopOpacity="0.75" />
            <Stop offset="25%" stopColor="#FF825A" stopOpacity="0.55" />
            <Stop offset="50%" stopColor="#FFA17F" stopOpacity="0.3" />
            <Stop offset="75%" stopColor="#FFC8B5" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="softCoralGlow" cx="15%" cy="8%" rx="60%" ry="40%">
            <Stop offset="0%" stopColor="#FFD0BC" stopOpacity="0.28" />
            <Stop offset="50%" stopColor="#FFE5D9" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect width="100%" height="100%" fill="url(#topGlow)" />
        <Rect width="100%" height="100%" fill="url(#coreAmberGlow)" />
        <Rect width="100%" height="100%" fill="url(#softCoralGlow)" />
      </Svg>

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
          <NotesStackedBanner />

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
                      onPress={(n) => {}}
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
                      onPress={(n) => {}}
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
                    onPress={(n) => {}}
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
