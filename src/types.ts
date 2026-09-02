export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export type ReflectionMode = 'reflection' | 'summary' | 'brainstorm' | 'action';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: number;
  mode?: ReflectionMode;
  modelUsed?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  category: 'journal' | 'reflection' | 'brainstorm' | 'summary' | 'problem_solving';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  summary?: string;
  keyInsights?: string[];
  sentiment?: string;
  isPinned?: boolean;
}

export interface PromptSuggestion {
  category: string;
  title: string;
  prompt: string;
}

export interface SecurityThreatItem {
  zone: string;
  risk: string;
  countermeasure: string;
  status: 'Enforced' | 'Verified';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  retryAction?: () => void;
}
