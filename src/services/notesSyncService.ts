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
  return {
    id: String(data.id || docId),
    title: String(data.title || "Untitled"),
    body: data.body ? String(data.body) : "",
    isPinned: Boolean(data.isPinned),
    iconName: data.iconName || undefined,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: data.updatedAt ? formatTimestamp(data.updatedAt) : undefined,
  };
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

        serverNotes.sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned));

        await saveNotes(serverNotes);

        onUpdate(serverNotes);
      },
      (error: any) => {
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

    serverNotes.sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned));
    await saveNotes(serverNotes);
    return serverNotes;
  } catch (err) {
    console.warn("[NotesSyncService] fetchNotesFromServer failed, returning local cache:", err);
    return await loadNotes();
  }
}

export async function pullAndMergeNotesFromFirestore(customUid?: string): Promise<NoteItem[] | null> {
  return fetchNotesFromServer(customUid);
}
