import { Ionicons } from "@expo/vector-icons";

export interface NoteItem {
  id: string;
  title: string;
  body?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
}
