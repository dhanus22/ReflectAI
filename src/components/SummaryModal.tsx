import React, { useState } from 'react';
import { JournalEntry } from '../types';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Copy, Check, FileText, CheckCircle2, Bookmark } from 'lucide-react';

interface SummaryModalProps {
  entry: JournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  entry,
  isOpen,
  onClose,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !entry) return null;

  const handleCopy = () => {
    if (!entry.summary) return;
    navigator.clipboard.writeText(entry.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#141414] w-full max-w-2xl rounded-2xl border border-[#262626] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#262626] bg-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#F5F5F5] text-base">
                Reflection Summary & Key Takeaways
              </h3>
              <p className="text-xs text-neutral-400">
                Extracted for: <span className="font-medium text-amber-300">{entry.title}</span>
              </p>
            </div>
          </div>

          <button
            id="btn-close-summary-modal"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222222] rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#0D0D0D]">
          {entry.summary ? (
            <div className="prose prose-invert max-w-none text-sm text-[#D4D4D4] leading-relaxed bg-[#161616] p-5 rounded-xl border border-[#262626]">
              <div className="markdown-body">
                <ReactMarkdown>{entry.summary}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-400 text-sm">
              No summary has been generated for this entry yet.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#121212] border-t border-[#262626] flex items-center justify-between">
          <button
            id="btn-copy-summary"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1C] hover:bg-[#262626] text-neutral-300 text-xs font-medium rounded-lg border border-[#2E2E2E] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Summary'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="btn-regenerate-summary"
              onClick={onRegenerate}
              className="px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
            >
              Regenerate
            </button>
            <button
              id="btn-done-summary"
              onClick={onClose}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-medium rounded-lg cursor-pointer shadow-md shadow-amber-950/30 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
