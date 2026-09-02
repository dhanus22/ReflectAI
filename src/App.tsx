import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, JournalEntry, ToastMessage } from './types';
import { auth, onAuthStateChanged } from './firebase';
import { subscribeUserEntries, deleteJournalEntry, saveJournalEntry } from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { HistorySidebar } from './components/HistorySidebar';
import { JournalEditor } from './components/JournalEditor';
import { SummaryModal } from './components/SummaryModal';
import { ThreatModelModal } from './components/ThreatModelModal';
import { WalkthroughGuide } from './components/WalkthroughGuide';
import { ToastContainer } from './components/Toast';
import { Loader2, Menu, X, BookOpen, Sparkles, Shield } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  
  // Modals & Drawers
  const [isThreatModalOpen, setIsThreatModalOpen] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [summaryModalEntry, setSummaryModalEntry] = useState<JournalEntry | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, description?: string, retryAction?: () => void) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, description, retryAction }]);
    if (type !== 'error') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to create a new blank entry
  const createNewEntry = useCallback((): JournalEntry => {
    return {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId: user?.uid || '',
      title: 'Untitled Reflection',
      category: 'journal',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
  }, [user]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
        };
        setUser(profile);
      } else {
        setUser(null);
        setEntries([]);
        setSelectedEntry(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore entries for authenticated user
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setSelectedEntry(null);
      return;
    }

    const unsubscribe = subscribeUserEntries(
      user.uid,
      (userEntries) => {
        setEntries(userEntries);
        // If no entry is currently selected or the selected entry was deleted, pick the latest or create a blank one
        setSelectedEntry((prev) => {
          if (!prev) {
            return userEntries.length > 0 ? userEntries[0] : createNewEntry();
          }
          const matched = userEntries.find((e) => e.id === prev.id);
          return matched || prev;
        });
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        addToast('error', 'Database Sync Error', 'Could not sync entries from Firestore. Please check permissions.', () => {
          // retry
          window.location.reload();
        });
      }
    );

    return () => unsubscribe();
  }, [user, createNewEntry, addToast]);

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsMobileSidebarOpen(false);
  };

  const handleNewEntry = () => {
    const blank = createNewEntry();
    setSelectedEntry(blank);
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      addToast('success', 'Entry Deleted', 'Reflection was successfully removed.');
      if (selectedEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        setSelectedEntry(remaining.length > 0 ? remaining[0] : createNewEntry());
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      addToast('error', 'Delete Failed', err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center mb-4 shadow-lg shadow-amber-950/40">
          <BookOpen className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-[#F5F5F5] font-serif font-bold text-lg mb-1 tracking-tight">ReflectAI</p>
        <p className="text-xs text-neutral-400 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
          Verifying security credentials & session...
        </p>
      </div>
    );
  }

  const handleStartLocalGuest = () => {
    const guestProfile: UserProfile = {
      uid: `guest_${Date.now()}`,
      email: null,
      displayName: 'Guest Explorer',
      photoURL: null,
      isAnonymous: true,
    };
    setUser(guestProfile);
    addToast('info', 'Demo Guest Session Active', 'You are exploring ReflectAI in Demo mode with local state storage.');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col text-[#E5E5E5] font-sans selection:bg-amber-900/50 selection:text-amber-200">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onNewEntry={handleNewEntry}
        onOpenThreatModel={() => setIsThreatModalOpen(true)}
        onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
        onLogout={() => {
          setUser(null);
          setEntries([]);
          setSelectedEntry(null);
        }}
        entriesCount={entries.length}
      />

      {/* Main Content Body */}
      {!user ? (
        <LandingPage
          onStartLocalGuest={handleStartLocalGuest}
          onError={(msg) => addToast('error', 'Authentication Alert', msg)}
        />
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col min-h-0">
          {/* Mobile history toggle bar */}
          <div className="md:hidden flex items-center justify-between mb-3 bg-[#141414] p-3 rounded-xl border border-[#262626] shadow-xs">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-200 cursor-pointer"
            >
              {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>{isMobileSidebarOpen ? 'Close History' : 'Past Reflections'}</span>
              <span className="bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {entries.length}
              </span>
            </button>

            <button
              onClick={handleNewEntry}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              + New
            </button>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-6.5rem)] min-h-[500px]">
            {/* Desktop / Collapsible Mobile History Sidebar */}
            <div
              className={`md:col-span-4 lg:col-span-3.5 h-full rounded-2xl overflow-hidden border border-[#262626] shadow-sm z-30 ${
                isMobileSidebarOpen
                  ? 'fixed inset-x-3 top-20 bottom-5 bg-[#141414] z-50 block md:static'
                  : 'hidden md:block'
              }`}
            >
              <HistorySidebar
                entries={entries}
                selectedEntryId={selectedEntry?.id || null}
                onSelectEntry={handleSelectEntry}
                onDeleteEntry={handleDeleteEntry}
                onNewEntry={handleNewEntry}
              />
            </div>

            {/* Active Journal & Reflection Editor */}
            <div className="md:col-span-8 lg:col-span-8.5 h-full">
              {selectedEntry ? (
                <JournalEditor
                  key={selectedEntry.id}
                  userId={user.uid}
                  entry={selectedEntry}
                  onUpdateEntry={(updated) => setSelectedEntry(updated)}
                  onOpenSummaryModal={(e) => setSummaryModalEntry(e)}
                  onError={(msg) => addToast('error', 'Operation Error', msg)}
                  onSuccess={(msg) => addToast('success', 'Success', msg)}
                />
              ) : (
                <div className="h-full bg-[#141414] rounded-2xl border border-[#262626] flex flex-col items-center justify-center p-8 text-center">
                  <BookOpen className="w-12 h-12 text-neutral-600 mb-3" />
                  <h3 className="font-serif font-bold text-neutral-200 text-lg mb-1">No reflection selected</h3>
                  <p className="text-xs text-neutral-400 max-w-sm mb-4">
                    Create a new reflection or pick a past entry from the sidebar to continue your dialogue.
                  </p>
                  <button
                    onClick={handleNewEntry}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-medium rounded-lg cursor-pointer shadow-md shadow-amber-950/40"
                  >
                    + Create Reflection
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Summary Modal */}
      <SummaryModal
        entry={summaryModalEntry}
        isOpen={Boolean(summaryModalEntry)}
        onClose={() => setSummaryModalEntry(null)}
        onRegenerate={() => {
          if (selectedEntry) {
            setSummaryModalEntry(null);
          }
        }}
      />

      {/* Threat Modeling Modal */}
      <ThreatModelModal
        isOpen={isThreatModalOpen}
        onClose={() => setIsThreatModalOpen(false)}
      />

      {/* Walkthrough & Test Matrix Guide */}
      <WalkthroughGuide
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
