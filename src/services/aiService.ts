import { ChatMessage, ReflectionMode, PromptSuggestion } from "../types";

export interface ReflectionResponse {
  success: boolean;
  response: string;
  modelUsed?: string;
  mode?: string;
  timestamp: number;
}

export interface SummaryResponse {
  success: boolean;
  summary: string;
  modelUsed?: string;
  timestamp: number;
}

export interface PromptsResponse {
  success: boolean;
  prompts: PromptSuggestion[];
}

/**
 * Call server-side Gemini reflection endpoint
 */
export async function generateReflection(params: {
  userPrompt: string;
  messages: ChatMessage[];
  mode: ReflectionMode;
  category?: string;
}): Promise<ReflectionResponse> {
  const res = await fetch("/api/ai/reflect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userPrompt: params.userPrompt,
      messages: params.messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      })),
      mode: params.mode,
      category: params.category,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${res.status}`);
  }

  return res.json();
}

/**
 * Call server-side Gemini summary endpoint
 */
export async function generateSummary(params: {
  title: string;
  content?: string;
  messages: ChatMessage[];
}): Promise<SummaryResponse> {
  const res = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: params.title,
      content: params.content,
      messages: params.messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      })),
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch personalized prompts
 */
export async function fetchSuggestedPrompts(recentThemes: string[] = []): Promise<PromptSuggestion[]> {
  try {
    const res = await fetch("/api/ai/prompts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recentThemes }),
    });

    if (!res.ok) throw new Error("Failed to fetch prompts");
    const data: PromptsResponse = await res.json();
    return data.prompts || [];
  } catch (err) {
    console.warn("Using fallback prompts:", err);
    return [
      { category: "Mindfulness", title: "Daily Grounding", prompt: "What is one moment today that made you pause, breathe, or feel grateful?" },
      { category: "Clarity", title: "Decision Crossroads", prompt: "What choice are you evaluating right now, and what values should guide your answer?" },
      { category: "Growth", title: "Learning from Friction", prompt: "Think of a recent obstacle. How did you respond, and what would you refine next time?" },
      { category: "Vision", title: "Ideal Tomorrow", prompt: "If tomorrow goes effortlessly well, what 3 intentions made that possible?" },
    ];
  }
}
