import React from 'react';
import { UserProfile } from '../types';
import { logOut } from '../firebase';
import { Sparkles, Plus, LogOut, ShieldCheck, CheckSquare, BookOpen, User } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  onNewEntry: () => void;
  onOpenThreatModel: () => void;
  onOpenWalkthrough: () => void;
  onLogout?: () => void;
  onOpenHistoryToggle?: () => void;
  entriesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewEntry,
  onOpenThreatModel,
  onOpenWalkthrough,
  onLogout,
  entriesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur border-b border-[#262626]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-950/40">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-[#F5F5F5] text-lg tracking-tight">ReflectAI</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-950/50 text-amber-300 rounded-full border border-amber-800/40">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">Private Authenticated Reflection & Journal</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <button
              id="btn-new-entry"
              onClick={onNewEntry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-medium rounded-lg shadow-md shadow-amber-950/30 transition-all cursor-pointer"
              title="Create a new journal reflection"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Entry</span>
            </button>
          )}

          <button
            id="btn-open-threat-model"
            onClick={onOpenThreatModel}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-neutral-300 bg-[#1C1C1C] hover:bg-[#262626] text-xs font-medium rounded-lg transition-colors cursor-pointer border border-[#2E2E2E]"
            title="View Security & Threat Model"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Threat Model</span>
          </button>

          <button
            id="btn-open-walkthrough"
            onClick={onOpenWalkthrough}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-neutral-300 bg-[#1C1C1C] hover:bg-[#262626] text-xs font-medium rounded-lg transition-colors cursor-pointer border border-[#2E2E2E]"
            title="View Walkthrough & Test Matrix"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Test Matrix</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-[#262626]">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-amber-800/40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#262626] text-amber-300 flex items-center justify-center font-semibold text-xs border border-[#383838]">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-[#EDEDED] truncate max-w-[130px]">
                    {user.displayName || (user.isAnonymous ? 'Guest User' : 'Authenticated User')}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate max-w-[130px]">
                    {user.email || 'Isolated Firestore Node'}
                  </p>
                </div>
              </div>

              <button
                id="btn-logout"
                onClick={async () => {
                  await logOut();
                  onLogout?.();
                }}
                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Sign out of your session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
