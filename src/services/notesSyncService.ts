import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { NoteItem } from "../components/notes/NoteItemCard";
import { loadNotes, saveNotes } from "./storageService";

function notesCollection() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return collection(db, "users", uid, "notes");
}

function noteDoc(noteId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return doc(db, "users", uid, "notes", noteId);
}

export async function syncNoteToFirestore(note: NoteItem): Promise<void> {
  const ref = noteDoc(note.id);
  if (!ref) return;

  try {
    await setDoc(
      ref,
      {
        id: note.id,
        title: note.title,
        body: note.body ?? "",
        isPinned: note.isPinned ?? false,
        createdAt: note.createdAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[NotesSyncService] upsert failed:", err);
  }
}

export async function deleteNoteFromFirestore(noteId: string): Promise<void> {
  const ref = noteDoc(noteId);
  if (!ref) return;

  try {
    await deleteDoc(ref);
  } catch (err) {
    console.warn("[NotesSyncService] delete failed:", err);
  }
}

export async function pullAndMergeNotesFromFirestore(): Promise<NoteItem[] | null> {
  const col = notesCollection();
  if (!col) return null;

  try {
    const snapshot = await getDocs(col);
    if (snapshot.empty) return null;

    const localNotes = await loadNotes();
    const mergedMap = new Map(localNotes.map((n) => [n.id, n]));

    snapshot.forEach((d) => {
      const data = d.data();
      const remote: NoteItem = {
        id: data.id,
        title: data.title ?? "",
        body: data.body ?? "",
        isPinned: data.isPinned ?? false,
        createdAt: data.createdAt ?? "",
      };

      const local = mergedMap.get(data.id);

      // Keep whichever version was updated most recently.
      // If updatedAt is missing, prefer remote (it's the authoritative source).
      const remoteTime = data.updatedAt?.toMillis?.() ?? 0;
      const localTime = local?.updatedAt
        ? new Date(local.updatedAt as string).getTime() || 0
        : 0;

      if (!local || remoteTime >= localTime) {
        mergedMap.set(data.id, remote);
      }
    });

    const merged = Array.from(mergedMap.values());
    await saveNotes(merged);
    return merged;
  } catch (err) {
    console.warn("[NotesSyncService] pull failed:", err);
    return null;
  }
}
