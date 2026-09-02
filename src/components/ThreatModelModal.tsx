import React from 'react';
import { ShieldCheck, X, CheckCircle2, Lock, AlertTriangle, Cpu, Database, Network } from 'lucide-react';
import { SecurityThreatItem } from '../types';

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const THREAT_MODEL_DATA: SecurityThreatItem[] = [
  {
    zone: '1. Input Surfaces',
    risk: 'Prompt Injection, untrusted markdown script payloads, oversized request payloads.',
    countermeasure: 'Strict parameterization, schema validation, payload length limits, client-side sanitized Markdown rendering.',
    status: 'Enforced',
  },
  {
    zone: '2. Planning & Reasoning',
    risk: 'System instruction overrides, model hallucination or refusal during peak load.',
    countermeasure: 'Grounded system prompts, 4-tier model fallback ladder (3.6 Flash -> 3.1 Flash Lite -> Flash Latest -> 3.7 Flash).',
    status: 'Enforced',
  },
  {
    zone: '3. Tool Execution',
    risk: 'Direct client-side key exposure, dynamic code evaluation, unauthorized endpoints.',
    countermeasure: 'Server-side API routes (/api/*) exclusively holding GEMINI_API_KEY. Zero client-side AI key exposure.',
    status: 'Enforced',
  },
  {
    zone: '4. Memory & State',
    risk: 'Cross-user data leakage, unauthorized read/write to other user journals.',
    countermeasure: 'Cloud Firestore Security Rules strictly owner-bound to /users/{userId} with request.auth.uid == userId validation.',
    status: 'Enforced',
  },
  {
    zone: '5. Inter-System Communication',
    risk: 'OAuth credential theft, plaintext password compromise, unverified tokens.',
    countermeasure: 'Federated Google Sign-In via Firebase Auth. No plaintext emails/passwords handled in custom code.',
    status: 'Enforced',
  },
];

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#141414] w-full max-w-3xl rounded-2xl border border-[#262626] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262626] bg-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#F5F5F5] text-base">
                Agentic Threat Model & Security Countermeasures
              </h3>
              <p className="text-xs text-neutral-400">
                Architectural Threat Analysis across the 5 Core Security Zones
              </p>
            </div>
          </div>

          <button
            id="btn-close-threat-modal"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222222] rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Threat Table */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#0D0D0D]">
          <p className="text-xs text-neutral-400 leading-relaxed font-light">
            In accordance with Production Directives, this application enforces strict defense-in-depth across input processing, model routing, database storage, and secret hygiene:
          </p>

          <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#141414]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#181818] border-b border-[#262626] text-neutral-300 font-semibold">
                  <th className="p-3 w-1/4">Threat Zone</th>
                  <th className="p-3 w-1/3">Identified Threat / Risk</th>
                  <th className="p-3">Architectural Countermeasure</th>
                  <th className="p-3 text-center w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {THREAT_MODEL_DATA.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#1A1A1A]/70">
                    <td className="p-3 font-semibold text-amber-300 align-top">
                      {item.zone}
                    </td>
                    <td className="p-3 text-neutral-400 align-top leading-relaxed">
                      {item.risk}
                    </td>
                    <td className="p-3 text-neutral-300 align-top leading-relaxed">
                      {item.countermeasure}
                    </td>
                    <td className="p-3 text-center align-top">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Firestore Security Rules Preview */}
          <div className="bg-[#0A0A0A] border border-[#262626] text-neutral-300 p-4 rounded-xl font-mono text-[11px] overflow-x-auto space-y-1">
            <div className="text-amber-400 font-bold mb-1">// Active Firestore Security Rule (Isolation Guarantee)</div>
            <div className="text-neutral-400">rules_version = '2';</div>
            <div className="text-neutral-300">service cloud.firestore &#123;</div>
            <div className="pl-4 text-neutral-300">match /databases/&#123;database&#125;/documents &#123;</div>
            <div className="pl-8 text-neutral-300">match /users/&#123;userId&#125;/entries/&#123;entryId&#125; &#123;</div>
            <div className="pl-12 text-emerald-400 font-semibold">allow read, write: if request.auth != null && request.auth.uid == userId;</div>
            <div className="pl-8 text-neutral-300">&#125;</div>
            <div className="pl-4 text-neutral-300">&#125;</div>
            <div className="text-neutral-300">&#125;</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#121212] border-t border-[#262626] flex justify-end">
          <button
            id="btn-threat-modal-done"
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-medium rounded-lg cursor-pointer shadow-md shadow-amber-950/30 transition-all"
          >
            Close Threat Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
