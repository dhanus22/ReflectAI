import React, { useState } from 'react';
import { CheckSquare, X, Check, ArrowRight, Shield, Sparkles, Database, FileText } from 'lucide-react';

interface WalkthroughGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestCase {
  id: string;
  category: string;
  title: string;
  steps: string[];
  expected: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'tc-auth',
    category: '1. User Authentication',
    title: 'Google Sign-In & Session Establishment',
    steps: [
      'Click "Sign in with Google" or "Demo Guest Access" on the landing page.',
      'Verify session authentication transitions immediately to the private dashboard.',
      'Check user avatar/display name in the top navbar.',
    ],
    expected: 'User receives a verified UID. Database reads/writes are restricted to this UID.',
  },
  {
    id: 'tc-reflect',
    category: '2. Multi-Turn AI Reflection',
    title: 'Conversational Journaling with Gemini 3.6 Flash',
    steps: [
      'Type a reflection into the prompt box (e.g., "I faced a roadblock at work today").',
      'Select a mode such as "Reflective Coach" or "Creative Ideas".',
      'Click "Send" or press Enter.',
      'Submit a second follow-up question in the same thread.',
    ],
    expected: 'Gemini responds with markdown-formatted guidance, maintaining multi-turn context.',
  },
  {
    id: 'tc-summary',
    category: '3. Cognitive Summarization',
    title: 'Executive Summary & Takeaway Extraction',
    steps: [
      'With an active conversation, click the "Summarize" button in the editor toolbar.',
      'View the structured summary modal containing Executive Summary, Key Insights, Emotional Tone, and Next Actions.',
      'Click "Copy Summary" to verify clipboard export.',
    ],
    expected: 'Summary is synthesized by Gemini and attached to the Firestore document.',
  },
  {
    id: 'tc-persistence',
    category: '4. Firestore Isolation & Persistence',
    title: 'Zero-Crash Payload & Owner UID Scoping',
    steps: [
      'Make edits to title, category, or tags (e.g. add #mindfulness).',
      'Notice the "Synced" badge turn green when saved to `/users/{userId}/entries/{entryId}`.',
      'Refresh the page or log in as another user to confirm entries are strictly isolated.',
    ],
    expected: 'No cross-user leakage. Firestore security rules reject any unauthorized UID access.',
  },
  {
    id: 'tc-history',
    category: '5. History & Search Filtering',
    title: 'Interactive Past Reflections & Filters',
    steps: [
      'Create 2 or more entries with distinct categories.',
      'Type a keyword into the search bar in the left sidebar.',
      'Click the category pills (Daily Reflection, Brainstorming) or "Has AI Summary".',
      'Select a past entry to load its multi-turn conversation.',
    ],
    expected: 'Filtered list updates instantly; selecting an entry restores full history.',
  },
  {
    id: 'tc-resilience',
    category: '6. Gemini Fallback Protocol',
    title: 'Multi-Tier Model Ladder & Error Recovery',
    steps: [
      'View server.ts fallback configuration: gemini-3.6-flash -> gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-3.7-flash.',
      'Verify the model tag badge in Gemini message bubbles.',
    ],
    expected: 'Automated failover handles transient rate limits or outages without breaking UX.',
  },
];

export const WalkthroughGuide: React.FC<WalkthroughGuideProps> = ({ isOpen, onClose }) => {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(completed).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#141414] w-full max-w-3xl rounded-2xl border border-[#262626] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262626] bg-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/40 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#F5F5F5] text-base">
                Functional Verification & Testing Walkthrough
              </h3>
              <p className="text-xs text-neutral-400">
                Step-by-step test matrix for all features and interactions ({completedCount}/{TEST_CASES.length} Completed)
              </p>
            </div>
          </div>

          <button
            id="btn-close-walkthrough-guide"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222222] rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test Matrix List */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#0D0D0D]">
          <p className="text-xs text-neutral-400 leading-relaxed font-light">
            Walk through each test scenario below to verify user authentication, multi-turn AI reasoning, summarization, and user-isolated Firestore persistence:
          </p>

          <div className="space-y-3">
            {TEST_CASES.map((tc) => {
              const isDone = Boolean(completed[tc.id]);
              return (
                <div
                  key={tc.id}
                  id={`walkthrough-${tc.id}`}
                  onClick={() => toggleCheck(tc.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isDone
                      ? 'bg-emerald-950/30 border-emerald-800/60 shadow-xs'
                      : 'bg-[#161616] hover:bg-[#1C1C1C] border-[#262626]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-[#3D3D3D] bg-[#1E1E1E]'
                        }`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          {tc.category}
                        </span>
                        <h4 className="text-xs font-bold text-[#EDEDED] mb-1.5">{tc.title}</h4>

                        <div className="text-xs text-neutral-400 space-y-1 mb-2 font-light">
                          {tc.steps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-neutral-400 font-mono">{sIdx + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>

                        <div className="text-[11px] text-emerald-300 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/40">
                          <strong>Expected Result:</strong> {tc.expected}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#121212] border-t border-[#262626] flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-medium">
            {completedCount === TEST_CASES.length ? '🎉 All Test Cases Verified!' : `${TEST_CASES.length - completedCount} items remaining`}
          </span>

          <button
            id="btn-walkthrough-guide-done"
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-medium rounded-lg cursor-pointer shadow-md shadow-amber-950/30 transition-all"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
