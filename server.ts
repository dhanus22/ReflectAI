import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee: JSON parser BEFORE routes)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Lazy GoogleGenAI client helper
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing or empty.");
  }
  return new GoogleGenAI({ apiKey });
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// Reusable Fallback Helper
async function generateContentWithFallback(
  ai: GoogleGenAI,
  promptConfig: {
    systemInstruction?: string;
    contents: any;
    generationConfig?: {
      temperature?: number;
      maxOutputTokens?: number;
    };
  }
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptConfig.contents,
        config: {
          systemInstruction: promptConfig.systemInstruction,
          temperature: promptConfig.generationConfig?.temperature ?? 0.7,
        },
      });

      const responseText = response.text;
      if (responseText && responseText.trim().length > 0) {
        return { text: responseText, modelUsed: modelName };
      }
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.statusCode || 500;
      const isRecoverable = [503, 429, 404, 500].includes(statusCode) || 
                            err?.message?.includes("not found") ||
                            err?.message?.includes("quota") ||
                            err?.message?.includes("overloaded");

      console.warn(`[Gemini Fallback] Model ${modelName} failed with: ${err.message || err}. Recoverable: ${isRecoverable}`);
      if (!isRecoverable && !err?.message?.includes("404")) {
        // If it's a completely unrecoverable auth error, break early
        if (statusCode === 401 || statusCode === 403) {
          throw err;
        }
      }
      // Continue to next model in ladder
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}

// --- API Routes ---

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    models: MODEL_FALLBACK_LADDER,
    timestamp: new Date().toISOString(),
  });
});

// Multi-turn Journal Reflection & Conversation
app.post("/api/ai/reflect", async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { messages = [], mode = "reflection", category = "journal", userPrompt = "" } = data;

    if (!userPrompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: "No prompt or conversation messages provided." });
    }

    const ai = getGeminiClient();

    let systemInstruction = `You are a thoughtful, empathetic, and insightful journaling companion and reflection guide.
Your role is to help the user unpack their thoughts, gain clarity, identify cognitive blind spots, and foster constructive growth.
Follow these guidelines:
- Be warm, non-judgmental, grounded, and concise.
- Provide structured observations, thoughtful questions to ponder, and gentle perspective shifts.
- Format responses cleanly with readable markdown, utilizing bullet points for takeaways and bold text for key insights.
- Do NOT lecture the user or sound like an automated robotic checklist. Speak authentically as a trusted mentor.`;

    if (mode === "brainstorm") {
      systemInstruction = `You are a creative, expansive brainstorming partner. 
Help the user explore angles, alternative paths, inventive solutions, and wild ideas to solve their problem or topic.
Structure your reply with:
1. Core Insights & Framing
2. Creative Angles & Possibilities (3-5 actionable ideas)
3. One provocative follow-up question to push their thinking further.`;
    } else if (mode === "summary") {
      systemInstruction = `You are an expert synthesizer. Provide a structured, clear summary of the user's reflection or journal entry.
Extract:
- Central Theme (1 sentence)
- Key Takeaways (3 concise bullet points)
- Underlying Emotions/Tone (1 sentence)
- Suggested Next Action or Follow-up Focus (1 actionable recommendation)`;
    } else if (mode === "action") {
      systemInstruction = `You are a practical, action-oriented problem solving coach. 
Help the user transition from reflection to concrete execution.
Break down their situation into:
1. The Core Challenge & Key Constraint
2. High-Impact Next Steps (ordered by priority)
3. Potential Obstacles & Mitigation Strategies`;
    }

    // Build multi-turn context
    const contents: any[] = [];
    
    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages) {
        if (!msg || typeof msg !== "object") continue;
        const role = msg.sender === "user" ? "user" : "model";
        const text = typeof msg.text === "string" ? msg.text : "";
        if (text.trim()) {
          contents.push({
            role,
            parts: [{ text }],
          });
        }
      }
    }

    // Append latest prompt if not already in messages
    if (userPrompt && (!contents.length || contents[contents.length - 1].parts[0].text !== userPrompt)) {
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }],
      });
    }

    if (contents.length === 0) {
      return res.status(400).json({ error: "Valid content text is required." });
    }

    const { text, modelUsed } = await generateContentWithFallback(ai, {
      systemInstruction,
      contents,
      generationConfig: {
        temperature: mode === "brainstorm" ? 0.85 : 0.6,
      },
    });

    return res.json({
      success: true,
      response: text,
      modelUsed,
      mode,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("[API /api/ai/reflect Error]:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate reflection with Gemini.",
      fallbackAttempted: true,
    });
  }
});

// Deep Summary & Insight Extractor
app.post("/api/ai/summarize", async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { title = "Journal Entry", content = "", messages = [] } = data;

    let fullText = content;
    if (!fullText && Array.isArray(messages)) {
      fullText = messages.map((m: any) => `${m.sender === "user" ? "User" : "Gemini"}: ${m.text}`).join("\n\n");
    }

    if (!fullText || fullText.trim().length === 0) {
      return res.status(400).json({ error: "No content provided to summarize." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are an expert cognitive synthesizer and journaling analyst.
Analyze the provided journal entry or reflection dialogue.
Respond with clean, structured markdown containing:
### Executive Summary
(A concise 2-3 sentence overview of what was discussed or felt)

### Key Insights & Patterns
- Bullet 1 (Core breakthrough or observation)
- Bullet 2 (Recurring theme or mental model)
- Bullet 3 (Actionable takeaway)

### Emotional Tone & Sentiment
(Identified emotional atmosphere, e.g., contemplative, energized, cautious, optimistic)

### Recommended Reflection Prompt
(1 provocative question for the user's next journal session)`;

    const contents = [
      {
        role: "user",
        parts: [{ text: `Title: ${title}\n\nJournal Content:\n${fullText}` }],
      },
    ];

    const { text, modelUsed } = await generateContentWithFallback(ai, {
      systemInstruction,
      contents,
      generationConfig: { temperature: 0.4 },
    });

    return res.json({
      success: true,
      summary: text,
      modelUsed,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("[API /api/ai/summarize Error]:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate summary.",
    });
  }
});

// Suggested Journaling Prompts
app.post("/api/ai/prompts", async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { recentThemes = [] } = data;

    const ai = getGeminiClient();
    const systemInstruction = `Generate 4 thoughtful, inspiring, and unique reflection/journaling prompts.
Return pure JSON with an array of objects: [{"category": "Mindfulness" | "Clarity" | "Growth" | "Decision", "title": "...", "prompt": "..."}]`;

    const promptText = recentThemes.length > 0
      ? `Generate 4 reflective journaling prompts inspired by these recent topics: ${recentThemes.join(", ")}`
      : `Generate 4 diverse, high-impact reflective journaling prompts for daily mindfulness, problem-solving, and personal clarity.`;

    const { text } = await generateContentWithFallback(ai, {
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.8 },
    });

    let prompts = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
      }
    } catch {
      prompts = [
        { category: "Clarity", title: "Unpack a decision", prompt: "What is a decision you are currently weighing, and what would your ideal outcome look like?" },
        { category: "Gratitude", title: "Underappreciated moment", prompt: "What was a quiet win or small moment of peace in your day today?" },
        { category: "Growth", title: "Challenge & Learning", prompt: "What challenged you recently, and what new perspective did it reveal to you?" },
        { category: "Vision", title: "One high-leverage shift", prompt: "If you could remove one friction point from your routine tomorrow, what would it be?" },
      ];
    }

    return res.json({ success: true, prompts });
  } catch (error: any) {
    console.error("[API /api/ai/prompts Error]:", error);
    // Return friendly default prompts if AI call fails
    return res.json({
      success: true,
      prompts: [
        { category: "Clarity", title: "Unpack a decision", prompt: "What is a decision you are currently weighing, and what would your ideal outcome look like?" },
        { category: "Gratitude", title: "Underappreciated moment", prompt: "What was a quiet win or small moment of peace in your day today?" },
        { category: "Growth", title: "Challenge & Learning", prompt: "What challenged you recently, and what new perspective did it reveal to you?" },
        { category: "Vision", title: "One high-leverage shift", prompt: "If you could remove one friction point from your routine tomorrow, what would it be?" },
      ],
    });
  }
});

// Vite Middleware & Static Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
