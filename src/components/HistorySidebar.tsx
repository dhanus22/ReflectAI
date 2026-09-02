import React, { useState } from 'react';
import { JournalEntry } from '../types';
import {
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  Trash2,
  Tag,
  ChevronRight,
  Filter,
  Layers,
  Check,
} from 'lucide-react';

interface HistorySidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onNewEntry: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlySummarized, setOnlySummarized] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter entries
  const filtered = entries.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesSummary = !onlySummarized || Boolean(e.summary);

    return matchesSearch && matchesCategory && matchesSummary;
  });

  const handleDelete = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === entryId) {
      onDeleteEntry(entryId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(entryId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <aside className="w-full h-full flex flex-col bg-[#141414] border-r border-[#262626]">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-[#262626] space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            id="input-search-entries"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries or tags..."
            className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#EDEDED] placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['all', 'journal', 'reflection', 'brainstorm', 'problem_solving'].map((cat) => (
            <button
              key={cat}
              id={`filter-cat-${cat}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold shadow-xs'
                  : 'bg-[#1C1C1C] hover:bg-[#262626] text-neutral-400 border border-[#2B2B2B]'
              }`}
            >
              {cat === 'all' ? 'All' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={onlySummarized}
              onChange={(e) => setOnlySummarized(e.target.checked)}
              className="rounded border-[#333333] bg-[#1A1A1A] text-amber-500 focus:ring-amber-500/40"
            />
            <span>Has AI Summary</span>
          </label>
          <span>{filtered.length} of {entries.length} reflections</span>
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4">
            <BookOpen className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-xs font-semibold text-neutral-300">No reflections found</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              {entries.length === 0
                ? 'Create your first journal entry to start reflecting with Gemini.'
                : 'Try adjusting your search or category filter.'}
            </p>
            {entries.length === 0 && (
              <button
                onClick={onNewEntry}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                + Start First Entry
              </button>
            )}
          </div>
        ) : (
          filtered.map((entry) => {
            const isSelected = selectedEntryId === entry.id;
            const snippet = entry.messages.length > 0 
              ? entry.messages[entry.messages.length - 1].text.slice(0, 75) + '...'
              : 'No messages yet';

            return (
              <div
                key={entry.id}
                id={`entry-card-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-[#1F1A14] border-amber-600/70 shadow-sm'
                    : 'bg-[#171717] hover:bg-[#1E1E1E] border-[#262626]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={`text-xs font-serif font-bold line-clamp-1 ${isSelected ? 'text-amber-200' : 'text-[#EDEDED]'}`}>
                    {entry.title}
                  </h4>

                  <button
                    onClick={(e) => handleDelete(e, entry.id)}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer ${
                      confirmDeleteId === entry.id ? 'opacity-100 text-rose-400 font-bold text-[10px]' : ''
                    }`}
                    title={confirmDeleteId === entry.id ? 'Click again to confirm delete' : 'Delete reflection'}
                  >
                    {confirmDeleteId === entry.id ? (
                      <span className="text-[10px] text-rose-400 font-bold">Confirm?</span>
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-neutral-400 line-clamp-2 mb-2 leading-relaxed font-light">
                  {snippet}
                </p>

                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span>{new Date(entry.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    <span>•</span>
                    <span>{entry.messages.length} turns</span>
                  </div>

                  {entry.summary && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" />
                      Summary
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
