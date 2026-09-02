import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, ChatMessage, ReflectionMode, PromptSuggestion } from '../types';
import { generateReflection, generateSummary, fetchSuggestedPrompts } from '../services/aiService';
import { saveJournalEntry, recordInteraction } from '../services/firestoreService';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Loader2,
  Bookmark,
  FileText,
  Lightbulb,
  CheckCircle2,
  Copy,
  Check,
  Tag,
  RefreshCw,
  Zap,
  BookOpen,
  Compass,
  AlertCircle,
} from 'lucide-react';

interface JournalEditorProps {
  userId: string;
  entry: JournalEntry;
  onUpdateEntry: (updated: JournalEntry) => void;
  onOpenSummaryModal: (entry: JournalEntry) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

const MODES: { id: ReflectionMode; label: string; icon: any; desc: string }[] = [
  { id: 'reflection', label: 'Reflective Coach', icon: BookOpen, desc: 'Empathetic exploration & clarity' },
  { id: 'brainstorm', label: 'Creative Ideas', icon: Lightbulb, desc: 'Unpack possibilities & brainstorm' },
  { id: 'summary', label: 'Synthesizer', icon: FileText, desc: 'Structured summary & key points' },
  { id: 'action', label: 'Action Coach', icon: Zap, desc: 'Break down concrete execution steps' },
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  userId,
  entry,
  onUpdateEntry,
  onOpenSummaryModal,
  onError,
  onSuccess,
}) => {
  const [inputText, setInputText] = useState('');
  const [currentMode, setCurrentMode] = useState<ReflectionMode>('reflection');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [prompts, setPrompts] = useState<PromptSuggestion[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGenerating]);

  // Load prompt ideas
  useEffect(() => {
    async function loadPrompts() {
      try {
        setLoadingPrompts(true);
        const list = await fetchSuggestedPrompts(entry.tags);
        setPrompts(list);
      } catch (e) {
        console.warn('Could not load prompts', e);
      } finally {
        setLoadingPrompts(false);
      }
    }
    loadPrompts();
  }, [entry.category]);

  const handleTitleChange = (newTitle: string) => {
    const updated = { ...entry, title: newTitle, updatedAt: Date.now() };
    onUpdateEntry(updated);
    setSaveStatus('unsaved');
  };

  const handleCategoryChange = (cat: any) => {
    const updated = { ...entry, category: cat, updatedAt: Date.now() };
    onUpdateEntry(updated);
    setSaveStatus('unsaved');
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const clean = newTagInput.trim().toLowerCase().replace(/^#/, '');
      if (!entry.tags.includes(clean)) {
        const updated = { ...entry, tags: [...entry.tags, clean], updatedAt: Date.now() };
        onUpdateEntry(updated);
        setSaveStatus('unsaved');
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = {
      ...entry,
      tags: entry.tags.filter((t) => t !== tagToRemove),
      updatedAt: Date.now(),
    };
    onUpdateEntry(updated);
    setSaveStatus('unsaved');
  };

  const handleSaveToFirestore = async (overrideEntry?: JournalEntry) => {
    const target = overrideEntry || entry;
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      const saved = await saveJournalEntry(userId, target);
      onUpdateEntry(saved);
      setSaveStatus('saved');
      onSuccess('Journal entry saved to your private Firestore collection.');
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      setSaveStatus('unsaved');
      onError(`Failed to save to Firestore: ${err.message || 'Unknown database error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputText).trim();
    if (!promptToSend || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text: promptToSend,
      timestamp: Date.now(),
      mode: currentMode,
    };

    const newMessages = [...entry.messages, userMsg];
    const interimEntry: JournalEntry = {
      ...entry,
      title: entry.title === 'Untitled Reflection' && promptToSend.length > 0 
        ? promptToSend.slice(0, 40) + (promptToSend.length > 40 ? '...' : '') 
        : entry.title,
      messages: newMessages,
      updatedAt: Date.now(),
    };

    // Update UI immediately (optimistic)
    onUpdateEntry(interimEntry);
    if (!customPrompt) setInputText('');
    setIsGenerating(true);
    setSaveStatus('saving');

    try {
      // Call Gemini backend API with fallback ladder
      const result = await generateReflection({
        userPrompt: promptToSend,
        messages: entry.messages,
        mode: currentMode,
        category: entry.category,
      });

      const geminiMsg: ChatMessage = {
        id: `msg_${Date.now()}_g`,
        sender: 'gemini',
        text: result.response,
        timestamp: Date.now(),
        mode: currentMode,
        modelUsed: result.modelUsed || 'gemini-3.6-flash',
      };

      const finalMessages = [...newMessages, geminiMsg];
      const completedEntry: JournalEntry = {
        ...interimEntry,
        messages: finalMessages,
        updatedAt: Date.now(),
      };

      // Guaranteed transaction verification: Save to Firestore
      const saved = await saveJournalEntry(userId, completedEntry);
      onUpdateEntry(saved);
      setSaveStatus('saved');

      // Also record interaction log to /users/{userId}/interactions/{interactionId}
      await recordInteraction(userId, promptToSend, result.response, currentMode);
    } catch (err: any) {
      console.error('Gemini interaction error:', err);
      onError(`Gemini reflection error: ${err.message || 'Check connection'}`);
      setSaveStatus('unsaved');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (entry.messages.length === 0 && !inputText.trim()) {
      onError('Please write a reflection or converse with Gemini before generating a summary.');
      return;
    }

    try {
      setIsSummarizing(true);
      const contentToSummarize = entry.messages.map((m) => `${m.sender}: ${m.text}`).join('\n\n') || inputText;
      
      const res = await generateSummary({
        title: entry.title,
        content: contentToSummarize,
        messages: entry.messages,
      });

      const updated: JournalEntry = {
        ...entry,
        summary: res.summary,
        updatedAt: Date.now(),
      };

      await handleSaveToFirestore(updated);
      onOpenSummaryModal(updated);
      onSuccess('Executive summary generated and synced to Firestore.');
    } catch (err: any) {
      console.error('Summary error:', err);
      onError(`Failed to generate summary: ${err.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] rounded-2xl border border-[#262626] shadow-sm overflow-hidden">
      {/* Editor Header */}
      <div className="px-6 py-4 border-b border-[#262626] bg-[#121212]/90 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title Input */}
          <input
            id="input-entry-title"
            type="text"
            value={entry.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Give this reflection a title..."
            className="text-xl sm:text-2xl font-serif font-bold text-[#F5F5F5] bg-transparent border-none focus:outline-hidden focus:ring-0 placeholder:text-neutral-600 w-full"
          />

          {/* Save Status & Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                saveStatus === 'saved'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                  : saveStatus === 'saving'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                  : 'bg-[#1F1F1F] text-neutral-400 border-[#333333]'
              }`}
            >
              {saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Synced</span>
                </>
              ) : saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Unsaved changes</span>
                </>
              )}
            </span>

            <button
              id="btn-manual-save"
              onClick={() => handleSaveToFirestore()}
              disabled={isSaving}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1C1C1C] hover:bg-[#262626] text-neutral-300 text-xs font-medium rounded-lg border border-[#2E2E2E] transition-colors cursor-pointer disabled:opacity-50"
              title="Save directly to Firestore"
            >
              <Bookmark className="w-3.5 h-3.5 text-neutral-400" />
              <span>Save</span>
            </button>

            <button
              id="btn-summarize-insights"
              onClick={handleGenerateSummary}
              disabled={isSummarizing || (entry.messages.length === 0 && !inputText.trim())}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-medium rounded-lg shadow-md shadow-amber-950/30 transition-all cursor-pointer disabled:opacity-50"
              title="Extract structured summary and insights"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{entry.summary ? 'View Summary' : 'Summarize'}</span>
            </button>
          </div>
        </div>

        {/* Category & Tags Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Category Select */}
          <select
            id="select-entry-category"
            value={entry.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="text-xs font-medium bg-[#1C1C1C] border border-[#2E2E2E] rounded-md px-2.5 py-1 text-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-amber-500/50 cursor-pointer"
          >
            <option value="journal">Daily Reflection</option>
            <option value="reflection">Deep Introspection</option>
            <option value="brainstorm">Brainstorming</option>
            <option value="problem_solving">Problem Solving</option>
          </select>

          {/* Tags list */}
          <div className="flex flex-wrap items-center gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#202020] text-neutral-300 border border-[#2E2E2E]"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-400 cursor-pointer text-neutral-400"
                >
                  &times;
                </button>
              </span>
            ))}

            <input
              id="input-add-tag"
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="+ tag (press Enter)"
              className="text-[11px] bg-transparent border-b border-dashed border-neutral-700 px-1 py-0.5 focus:outline-hidden focus:border-amber-500/70 w-28 text-neutral-300 placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      {/* Main Conversation & Messages View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0D0D0D]">
        {entry.messages.length === 0 ? (
          <div className="max-w-xl mx-auto py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-serif font-bold text-[#F5F5F5] mb-2">Begin your reflection</h2>
            <p className="text-neutral-400 text-sm mb-6 leading-relaxed font-light">
              Write down your thoughts, describe a challenge, or click an inspiring prompt below to converse with Gemini.
            </p>

            {/* Prompt Suggestions */}
            <div className="text-left bg-[#141414] rounded-xl border border-[#262626] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  Suggested Starting Prompts
                </span>
                {loadingPrompts && <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prompts.map((p, idx) => (
                  <button
                    key={idx}
                    id={`btn-prompt-suggestion-${idx}`}
                    onClick={() => handleSendMessage(p.prompt)}
                    className="p-3 text-left rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#262626] hover:border-amber-700/50 transition-colors cursor-pointer group"
                  >
                    <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider block mb-1">
                      {p.category} • {p.title}
                    </span>
                    <p className="text-xs text-neutral-400 line-clamp-2 group-hover:text-neutral-200">
                      {p.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {entry.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'gemini' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#242424] text-[#EDEDED] border border-[#383838] rounded-tr-xs'
                      : 'bg-[#161616] text-[#D4D4D4] border border-[#262626] rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-white/10 text-[11px] opacity-70">
                    <span className="font-semibold text-[#EDEDED]">
                      {msg.sender === 'user' ? 'You' : 'Gemini 3.6 Flash'}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.modelUsed && (
                        <span className="text-[10px] font-mono bg-[#1F1F1F] text-amber-300 px-1.5 py-0.5 rounded border border-[#333333]">
                          {msg.modelUsed}
                        </span>
                      )}
                      <span className="text-neutral-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="hover:opacity-100 transition-opacity cursor-pointer ml-1 text-neutral-400 hover:text-white"
                        title="Copy message"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className={`text-sm leading-relaxed ${msg.sender === 'user' ? 'text-[#EDEDED] whitespace-pre-wrap' : 'prose prose-invert max-w-none text-[#D4D4D4]'}`}>
                    {msg.sender === 'user' ? (
                      msg.text
                    ) : (
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-[#333333] text-amber-300 flex items-center justify-center shrink-0 shadow-sm mt-1 text-xs font-bold border border-[#444444]">
                    U
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3 justify-start items-center text-neutral-400 text-xs">
                <div className="w-8 h-8 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-[#161616] border border-[#262626] rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-2">
                  <span className="text-neutral-200 font-medium">Gemini is reflecting...</span>
                  <span className="text-[10px] text-neutral-400">(Ladder fallback active)</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Interaction Mode Switcher & Input Footer */}
      <div className="p-4 border-t border-[#262626] bg-[#121212] space-y-3">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">Mode:</span>
          {MODES.map((m) => {
            const Icon = m.icon;
            const isSelected = currentMode === m.id;
            return (
              <button
                key={m.id}
                id={`btn-mode-${m.id}`}
                onClick={() => setCurrentMode(m.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow-xs font-semibold'
                    : 'bg-[#1A1A1A] hover:bg-[#242424] text-neutral-400 border border-[#2A2A2A]'
                }`}
                title={m.desc}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Form */}
        <div className="relative flex items-end gap-2 bg-[#0F0F0F] border border-[#2E2E2E] rounded-xl p-2 focus-within:ring-1 focus-within:ring-amber-500/50 focus-within:border-amber-500/50 transition-all">
          <textarea
            id="textarea-journal-prompt"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Reflect with ${MODES.find((m) => m.id === currentMode)?.label}... (Press Enter to send, Shift+Enter for newline)`}
            rows={2}
            className="w-full bg-transparent resize-none border-none focus:outline-hidden text-sm text-[#EDEDED] placeholder:text-neutral-400 p-1"
          />

          <button
            id="btn-send-reflection"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isGenerating}
            className="px-2 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg font-medium text-xs shadow-md shadow-amber-950/30 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            title="Send prompt to Gemini"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            
          </button>
        </div>
      </div>
    </div>
  );
};
