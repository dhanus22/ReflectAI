import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { JournalEntry } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Strict Undefined-Stripping Utility
 * Prevents Firestore runtime errors caused by undefined field values.
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (value === undefined ? null : value))
  );
}

// In-memory / LocalStorage helpers for Guest / Demo sessions
const GUEST_STORAGE_PREFIX = "reflect_guest_entries_";
const guestListeners: Map<string, Set<(entries: JournalEntry[]) => void>> = new Map();

function getGuestEntries(userId: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(`${GUEST_STORAGE_PREFIX}${userId}`);
    if (!raw) {
      // Return a welcoming sample reflection for new demo guests
      const sampleEntry: JournalEntry = {
        id: `demo_entry_${Date.now()}`,
        userId,
        title: "Welcome to ReflectAI (Guest Mode)",
        category: "journal",
        tags: ["welcome", "demo"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          {
            id: `msg_init_u`,
            sender: "user",
            text: "Hi Gemini, I'm starting my journal reflection for today.",
            timestamp: Date.now() - 60000,
          },
          {
            id: `msg_init_g`,
            sender: "gemini",
            text: "Welcome to your private reflection space! How are you feeling right now, and what's on your mind today? Choose any coaching mode above (Reflective Coach, Creative Ideas, Synthesizer, Action Coach) and let's explore together.",
            timestamp: Date.now() - 30000,
            mode: "reflection",
            modelUsed: "gemini-3.6-flash",
          },
        ],
      };
      saveGuestEntries(userId, [sampleEntry]);
      return [sampleEntry];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveGuestEntries(userId: string, entries: JournalEntry[]) {
  try {
    localStorage.setItem(`${GUEST_STORAGE_PREFIX}${userId}`, JSON.stringify(entries));
    const listeners = guestListeners.get(userId);
    if (listeners) {
      listeners.forEach((cb) => cb([...entries]));
    }
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }
}

/**
 * Save or update a journal entry in the user's isolated subcollection
 * Path: /users/{userId}/entries/{entryId}
 */
export async function saveJournalEntry(
  userId: string,
  entry: Partial<JournalEntry> & { id?: string }
): Promise<JournalEntry> {
  if (!userId) {
    throw new Error("Cannot save entry: User is not authenticated.");
  }

  const entryId = entry.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();

  const fullEntry: JournalEntry = {
    id: entryId,
    userId,
    title: entry.title?.trim() || "Untitled Reflection",
    category: entry.category || "journal",
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    createdAt: entry.createdAt || now,
    updatedAt: now,
    messages: Array.isArray(entry.messages) ? entry.messages : [],
    summary: entry.summary || undefined,
    keyInsights: Array.isArray(entry.keyInsights) ? entry.keyInsights : undefined,
    sentiment: entry.sentiment || undefined,
    isPinned: Boolean(entry.isPinned),
  };

  // If running in local guest mode, persist to localStorage
  if (userId.startsWith("guest_")) {
    const list = getGuestEntries(userId);
    const existingIndex = list.findIndex((e) => e.id === entryId);
    if (existingIndex >= 0) {
      list[existingIndex] = fullEntry;
    } else {
      list.unshift(fullEntry);
    }
    saveGuestEntries(userId, list);
    return fullEntry;
  }

  const cleanData = sanitizePayload(fullEntry);
  const path = `users/${userId}/entries/${entryId}`;
  try {
    const docRef = doc(db, "users", userId, "entries", entryId);
    await setDoc(docRef, cleanData, { merge: true });
    return fullEntry;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return fullEntry;
  }
}

/**
 * Record a single prompt-response interaction to the user's isolated interactions subcollection
 * Path: /users/{userId}/interactions/{interactionId}
 */
export async function recordInteraction(
  userId: string,
  prompt: string,
  response: string,
  mode: string = "reflection"
): Promise<string> {
  if (!userId) return "";

  const interactionId = `int_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  if (userId.startsWith("guest_")) {
    return interactionId;
  }

  const path = `users/${userId}/interactions/${interactionId}`;
  const docRef = doc(db, "users", userId, "interactions", interactionId);
  const payload = sanitizePayload({
    id: interactionId,
    userId,
    prompt,
    response,
    mode,
    createdAt: Date.now(),
  });

  try {
    await setDoc(docRef, payload);
    return interactionId;
  } catch (err) {
    console.warn("Could not record interaction log to Firestore:", err);
    return "";
  }
}

/**
 * Real-time listener for user entries
 */
export function subscribeUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // If local guest session
  if (userId.startsWith("guest_")) {
    const initial = getGuestEntries(userId);
    onUpdate(initial);

    if (!guestListeners.has(userId)) {
      guestListeners.set(userId, new Set());
    }
    guestListeners.get(userId)?.add(onUpdate);

    return () => {
      guestListeners.get(userId)?.delete(onUpdate);
    };
  }

  const path = `users/${userId}/entries`;
  const entriesRef = collection(db, "users", userId, "entries");
  const q = query(entriesRef, orderBy("updatedAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      onUpdate(entries);
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Fetch all entries once
 */
export async function fetchUserEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];

  if (userId.startsWith("guest_")) {
    return getGuestEntries(userId);
  }

  const path = `users/${userId}/entries`;
  try {
    const entriesRef = collection(db, "users", userId, "entries");
    const q = query(entriesRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as JournalEntry);
    });
    return entries;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Delete a specific entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error("Missing userId or entryId for deletion.");
  }

  if (userId.startsWith("guest_")) {
    const list = getGuestEntries(userId).filter((e) => e.id !== entryId);
    saveGuestEntries(userId, list);
    return;
  }

  const path = `users/${userId}/entries/${entryId}`;
  try {
    const docRef = doc(db, "users", userId, "entries", entryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
