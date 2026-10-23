import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  onSnapshot,
  serverTimestamp,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { db, auth } from "./firebase";
import { NoteItem } from "../types/note";
import { loadNotes, saveNotes } from "./storageService";

function notesCollection(customUid?: string) {
  const uid = customUid || auth.currentUser?.uid;
  if (!uid) return null;
  return collection(db, "users", uid, "notes");
}

function noteDoc(noteId: string, customUid?: string) {
  const uid = customUid || auth.currentUser?.uid;
  if (!uid) return null;
  return doc(db, "users", uid, "notes", noteId);
}

function formatTimestamp(value: any): string {
  if (!value) {
    return new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (typeof value === "string") return value;
  if (typeof value === "number") {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (value.toDate && typeof value.toDate === "function") {
    return value.toDate().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return String(value);
}

export function normalizeNoteItem(data: any, docId: string): NoteItem {
  let updatedAtMs = typeof data.updatedAtMs === "number" ? data.updatedAtMs : undefined;
  if (!updatedAtMs && data.serverUpdatedAt?.toMillis) {
    updatedAtMs = data.serverUpdatedAt.toMillis();
  }
  if (!updatedAtMs && data.updatedAt && !isNaN(Date.parse(data.updatedAt))) {
    updatedAtMs = Date.parse(data.updatedAt);
  }
  if (!updatedAtMs && data.createdAt && !isNaN(Date.parse(data.createdAt))) {
    updatedAtMs = Date.parse(data.createdAt);
  }

  return {
    id: String(data.id || docId),
    title: String(data.title || "Untitled"),
    body: data.body ? String(data.body) : "",
    isPinned: Boolean(data.isPinned),
    iconName: data.iconName || undefined,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: data.updatedAt ? formatTimestamp(data.updatedAt) : undefined,
    updatedAtMs: updatedAtMs || 0,
  };
}

export function sortNotesChronologically(notes: NoteItem[]): NoteItem[] {
  return [...notes].sort((a, b) => {
    if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
      return Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
    }
    return (b.updatedAtMs || 0) - (a.updatedAtMs || 0);
  });
}

export function subscribeToNotesServer(
  onUpdate: (notes: NoteItem[]) => void,
  customUid?: string
): () => void {
  const uid = customUid || auth.currentUser?.uid;
  if (!uid) return () => {};

  try {
    const colRef = collection(db, "users", uid, "notes");

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        if (!snapshot) return;

        const serverNotes: NoteItem[] = [];
        snapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          serverNotes.push(normalizeNoteItem(docSnap.data(), docSnap.id));
        });

        const sorted = sortNotesChronologically(serverNotes);
        await saveNotes(sorted);
        onUpdate(sorted);
      },
      (error: any) => {
        if (
          error?.code === "firestore/permission-denied" ||
          error?.message?.includes("permission-denied")
        ) {
          return;
        }
        console.warn("[NotesSyncService] Snapshot error:", error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("[NotesSyncService] subscribeToNotesServer failed:", err);
    return () => {};
  }
}

export async function syncNoteToFirestore(note: NoteItem, customUid?: string): Promise<void> {
  const ref = noteDoc(note.id, customUid);
  if (!ref) return;

  try {
    const now = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const nowMs = typeof note.updatedAtMs === "number" && note.updatedAtMs > 0 ? note.updatedAtMs : Date.now();

    await setDoc(
      ref,
      {
        id: note.id,
        title: note.title,
        body: note.body ?? "",
        isPinned: Boolean(note.isPinned),
        iconName: note.iconName || null,
        createdAt: note.createdAt || now,
        updatedAt: note.updatedAt || now,
        updatedAtMs: nowMs,
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[NotesSyncService] syncNoteToFirestore failed:", err);
  }
}

export async function deleteNoteFromFirestore(noteId: string, customUid?: string): Promise<void> {
  const ref = noteDoc(noteId, customUid);
  if (!ref) return;

  try {
    await deleteDoc(ref);
  } catch (err) {
    console.warn("[NotesSyncService] deleteNoteFromFirestore failed:", err);
  }
}

export async function fetchNotesFromServer(customUid?: string): Promise<NoteItem[]> {
  const col = notesCollection(customUid);
  if (!col) return await loadNotes();

  try {
    const snapshot = await getDocs(col);
    const serverNotes: NoteItem[] = [];

    snapshot.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      serverNotes.push(normalizeNoteItem(d.data(), d.id));
    });

    const sorted = sortNotesChronologically(serverNotes);
    await saveNotes(sorted);
    return sorted;
  } catch (err) {
    console.warn("[NotesSyncService] fetchNotesFromServer failed, returning local cache:", err);
    return await loadNotes();
  }
}

export async function pullAndMergeNotesFromFirestore(customUid?: string): Promise<NoteItem[] | null> {
  return fetchNotesFromServer(customUid);
}
