import React, { useState } from 'react';
import { signInWithGoogle } from '../firebase';
import { ShieldCheck, Lock, Sparkles, BookOpen, Database, ArrowRight, Bot } from 'lucide-react';

interface LandingPageProps {
  onStartLocalGuest: () => void;
  onError: (msg: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartLocalGuest, onError }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      onError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = () => {
    // Start local interactive demo session directly without relying on Firebase Anonymous provider
    onStartLocalGuest();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0A0A] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Main Hero Card */}
        <div className="bg-[#141414] rounded-2xl border border-[#262626] shadow-xl p-8 sm:p-12 mb-8 text-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-600/10 blur-3xl pointer-events-none rounded-full" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/50 text-amber-300 border border-amber-800/40 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Authenticated AI Journaling with Cloud Firestore & Gemini</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#F5F5F5] tracking-tight mb-4 leading-tight">
            Private reflections, elevated by deep AI insights.
          </h1>

          <p className="text-neutral-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            A secure multi-turn journal workspace where your entries remain strictly isolated to your verified account, paired with Gemini 3.6 Flash for cognitive summaries, brainstorming, and mindful coaching.
          </p>

          {/* Authentication CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-8">
            <button
              id="btn-google-signin"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-[#FAFAFA] hover:bg-white text-neutral-950 text-sm font-semibold rounded-xl shadow-lg shadow-black/40 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>

            <button
              id="btn-guest-signin"
              onClick={handleGuestSignIn}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#1C1C1C] hover:bg-[#262626] text-[#E5E5E5] text-sm font-medium rounded-xl border border-[#333333] transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Demo Guest Access</span>
              <ArrowRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-6 border-t border-[#222222] grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#F5F5F5]">Owner UID Isolation</p>
                <p className="text-[11px] text-neutral-400">Enforced by verified Firestore security rules.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Bot className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#F5F5F5]">Gemini 3.6 Flash Fallback</p>
                <p className="text-[11px] text-neutral-400">Multi-tier model resilience ladder.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#F5F5F5]">Zero Password Storage</p>
                <p className="text-[11px] text-neutral-400">Federated OAuth token acquisition only.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#141414] p-6 rounded-xl border border-[#262626] shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#F5F5F5] mb-1.5 font-serif">Multi-Turn Reflections</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Engage in multi-turn dialogues with Gemini to unpack complicated emotions, decision forks, and daily reflections.
            </p>
          </div>

          <div className="bg-[#141414] p-6 rounded-xl border border-[#262626] shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-800/40 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#F5F5F5] mb-1.5 font-serif">Cognitive Summaries</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Extract key insights, emotional tone, and actionable recommendations with 1-click AI summarization.
            </p>
          </div>

          <div className="bg-[#141414] p-6 rounded-xl border border-[#262626] shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#F5F5F5] mb-1.5 font-serif">User-Isolated Firestore</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Each user's journal is scoped to <code className="font-mono text-amber-300">/users/&#123;userId&#125;/entries</code> with granular read/write rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
