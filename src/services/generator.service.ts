import { prisma } from "@/lib/prisma";

const TONE_GUIDANCE: Record<string, string> = {
  PROFESSIONAL: "Maintain a polished, business-ready tone with precise terminology.",
  CASUAL: "Use a relaxed, conversational tone that feels natural and approachable.",
  FRIENDLY: "Be warm and approachable, using encouraging and inclusive language.",
  FORMAL: "Use formal, courteous language suitable for official communication.",
  CREATIVE: "Encourage imaginative thinking, vivid language, and original ideas.",
  TECHNICAL: "Use accurate technical terms and focus on implementation details.",
  HUMOROUS: "Add light, appropriate humor to keep the interaction engaging.",
  PERSUASIVE: "Use compelling arguments and clear calls to action.",
  NEUTRAL: "Keep the tone objective, balanced, and free of emotional language.",
  CUSTOM: "Adapt the tone to best fit the user's stated needs.",
};

const LENGTH_GUIDANCE: Record<string, string> = {
  SHORT: "Keep the response concise: 1-2 sentences, high signal-to-noise ratio.",
  MEDIUM: "Aim for a single focused paragraph (roughly 100-200 words).",
  LONG: "Provide a thorough response spanning 2-3 paragraphs with examples.",
  VERY_LONG: "Provide an exhaustive, structured response of 4+ paragraphs.",
};

const COMPLEXITY_GUIDANCE: Record<string, string> = {
  BEGINNER: "Assume no prior knowledge. Explain concepts from the ground up.",
  INTERMEDIATE: "Assume basic familiarity. Focus on practical application.",
  ADVANCED: "Assume strong knowledge. Prioritize depth, edge cases, and nuance.",
  EXPERT: "Assume expert-level mastery. Discuss advanced strategies and trade-offs.",
};

const FORMAT_GUIDANCE: Record<string, string> = {
  MARKDOWN: "Format the response using Markdown with clear headings and lists.",
  JSON: "Return valid, well-structured JSON with sensible field names.",
  TEXT: "Return plain text without special formatting.",
  HTML: "Return clean, semantic HTML.",
  CSV: "Return tabular data as CSV with a header row.",
  CODE: "Return code only, with comments where helpful.",
  TABLE: "Organize information in tables where applicable.",
  LIST: "Present the response as structured bullet or numbered lists.",
  YAML: "Return the response as valid YAML.",
  XML: "Return well-formed XML with clear element structure.",
};

export class GeneratorService {
  static buildPrompt(input: {
    idea: string;
    platform: string;
    tone: string;
    language: string;
    complexity: string;
    length: string;
    outputFormat: string;
  }) {
    const {
      idea,
      platform,
      tone,
      language,
      complexity,
      length,
      outputFormat,
    } = input;

    const platformLabel = platform
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");

    return [
      `# ${idea.trim().replace(/\s+/g, " ")}`,
      ``,
      `## Role`,
      `You are an expert prompt engineer with deep knowledge of ${platformLabel} capabilities, known for crafting precise, effective prompts that produce consistent, high-quality results.`,
      ``,
      `## Task`,
      idea.trim(),
      ``,
      `## Requirements`,
      `- ${TONE_GUIDANCE[tone] || TONE_GUIDANCE.PROFESSIONAL}`,
      `- ${LENGTH_GUIDANCE[length] || LENGTH_GUIDANCE.MEDIUM}`,
      `- ${COMPLEXITY_GUIDANCE[complexity] || COMPLEXITY_GUIDANCE.INTERMEDIATE}`,
      `- ${FORMAT_GUIDANCE[outputFormat] || FORMAT_GUIDANCE.MARKDOWN}`,
      `- Write in the language the user requests, defaulting to English when unspecified`,
      ``,
      `## Guidelines`,
      `1. Be specific and detailed in every instruction`,
      `2. Include concrete examples where applicable`,
      `3. Define clear output expectations and boundaries`,
      `4. Add constraints to prevent ambiguity`,
      `5. Structure the response for maximum readability`,
      ``,
      `## Output Format`,
      `Provide the final output in ${outputFormat.toLowerCase()} format as specified above.`,
    ].join("\n");
  }

  static async getHistory(clerkId: string, limit = 10) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return [];

    const events = await prisma.usage.findMany({
      where: { userId: user.id, action: "PROMPT_GENERATE" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return events.map((e: any) => ({
      id: e.id,
      idea: (e.metadata as any)?.idea || "Generated prompt",
      platform: (e.metadata as any)?.platform || "GENERIC",
      createdAt: e.createdAt,
    }));
  }

  static async clearHistory(clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return { cleared: 0 };

    const result = await prisma.usage.deleteMany({
      where: { userId: user.id, action: "PROMPT_GENERATE" },
    });

    return { cleared: result.count };
  }
}
