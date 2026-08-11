import { analyzePrompt } from "./analyzer";
import type { PromptAnalysisResult, PromptFixResult } from "./types";

const DOMAIN_ROLES: Array<{ words: string[]; role: string }> = [
  {
    words: ["software", "code", "coding", "developer", "programming", "api", "backend", "frontend", "database", "function", "bug", "algorithm"],
    role: "senior software engineer",
  },
  { words: ["design", "designer", "ui", "ux", "figma", "layout", "logo", "brand"], role: "design expert" },
  { words: ["marketing", "seo", "copywriting", "campaign", "social media", "content", "ads"], role: "marketing strategist and copywriter" },
  { words: ["data", "analytics", "statistics", "dataset", "metrics", "kpi"], role: "data analyst" },
  { words: ["finance", "budget", "revenue", "cost", "invoice", "pricing"], role: "financial analyst" },
  { words: ["legal", "contract", "compliance", "policy", "terms"], role: "legal advisor" },
  { words: ["medical", "health", "patient", "diagnosis", "therapy"], role: "healthcare specialist" },
  { words: ["education", "teaching", "students", "lesson", "curriculum", "training", "course"], role: "educator and curriculum designer" },
  { words: ["email", "letter", "proposal", "message", "outreach"], role: "professional communicator" },
  { words: ["research", "academic", "paper", "thesis", "literature", "study"], role: "research analyst" },
];

const GENERIC_CONSTRAINTS = [
  "Do not invent facts, figures, or claims that were not provided.",
  "Stay strictly within the scope of the request; do not add unrelated content.",
  "If information is missing, state the assumption explicitly instead of guessing.",
];

const GENERIC_OUTPUT_FORMAT = [
  "Return a clearly structured response with headings and bullet lists where useful.",
  "Keep the response focused on the request and free of filler text.",
];

function detectDomainRole(text: string): string {
  const lower = text.toLowerCase();
  for (const entry of DOMAIN_ROLES) {
    const matches = entry.words.filter((w) => lower.includes(w));
    if (matches.length >= 2) return entry.role;
  }
  return "subject matter expert";
}

function normalizeLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeLines(lines: string[]): { lines: string[]; removed: number } {
  const seen = new Map<string, number>();
  const kept: string[] = [];
  let removed = 0;
  for (const line of lines) {
    const norm = normalizeLine(line);
    if (norm.length < 4) {
      kept.push(line);
      continue;
    }
    const count = seen.get(norm) || 0;
    if (count > 0) {
      removed++;
      continue;
    }
    seen.set(norm, 1);
    kept.push(line);
  }
  return { lines: kept, removed };
}

function removeContradictingSentence(
  text: string,
  pairs: Array<[RegExp, RegExp]>
): { text: string; resolved: string | null } {
  let result = text;
  let resolved: string | null = null;
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  for (const [a, b] of pairs) {
    if (!a.test(text) || !b.test(text)) continue;
    const firstA = text.search(a);
    const firstB = text.search(b);
    const second = firstB > firstA ? firstB : firstA;
    if (second === -1) continue;
    let consumed = 0;
    for (let i = 0; i < sentences.length; i++) {
      const next = consumed + sentences[i].length + 1;
      if (second < next) {
        resolved = sentences[i].trim().slice(0, 80);
        result = result.replace(sentences[i], "").replace(/\n{3,}/g, "\n\n");
        break;
      }
      consumed = next;
    }
    if (resolved) break;
  }
  return { text: result.trim(), resolved };
}

/**
 * Builds an improved version of the prompt. Only missing building blocks are
 * added — existing role/constraints/format content is never duplicated, so
 * the improved prompt cannot contradict the original.
 */
export function improvePrompt(content: string): PromptFixResult {
  const analysis = analyzePrompt(content);
  const scores = Object.fromEntries(analysis.scores.map((s) => [s.code, s.score]));
  const changes: PromptFixResult["changes"] = [];
  const lines: string[] = [];

  const hasRole = scores.role >= 40;
  const hasContext = scores.context >= 40;
  const hasConstraints = scores.constraints >= 40;
  const hasFormat = scores.outputFormat >= 40;

  if (!hasRole) {
    lines.push("## Role");
    lines.push(`You are an ${detectDomainRole(content)}.`);
    lines.push("");
    changes.push({ type: "added", label: "Added a role definition with an expertise domain." });
  }

  if (!hasContext) {
    const firstLine =
      content
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 3 && !l.startsWith("#")) || content.trim().split(/[.!?\n]/)[0];
    lines.push("## Context");
    lines.push(
      `The task below is ${firstLine ? `: "${truncate(firstLine, 100)}". ` : ""}Tailor the response to the intended audience and state any assumptions you make.`
    );
    lines.push("");
    changes.push({ type: "added", label: "Added a context section that anchors the task and audience." });
  }

  const { lines: cleanLines, removed } = dedupeLines(content.split("\n"));
  const cleaned = cleanLines.join("\n").trim();

  const { text: conflictFree, resolved } = removeContradictingSentence(cleaned, [
    [/always/gi, /never/gi],
    [/\bmust\b/gi, /\bmust not\b/gi],
    [/do not|don't/gi, /\bdo\b|should\b/gi],
    [/include/gi, /exclude/gi],
  ]);
  if (resolved) {
    changes.push({
      type: "removed",
      label: `Resolved a contradiction by removing: "${truncate(resolved, 60)}".`,
    });
  }
  const taskText = conflictFree || cleaned;

  lines.push("## Task");
  lines.push(taskText);
  lines.push("");
  if (removed > 0) {
    changes.push({ type: "removed", label: `Removed ${removed} duplicated instruction line(s).` });
  }

  if (!hasConstraints) {
    lines.push("## Constraints");
    GENERIC_CONSTRAINTS.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
    changes.push({ type: "added", label: "Added explicit constraints and boundaries." });
  }

  if (!hasFormat) {
    lines.push("## Output Format");
    GENERIC_OUTPUT_FORMAT.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
    changes.push({ type: "added", label: "Specified the output format and response style." });
  }

  const placeholders = analysis.stats.placeholders;
  if (placeholders.length > 0) {
    lines.push("## Inputs");
    lines.push(
      `This prompt expects the following input(s): ${placeholders.map((p) => `"${p}"`).join(", ")}. Provide concrete values for them before generating the output.`
    );
    lines.push("");
    changes.push({
      type: "defined",
      label: `Defined placeholder variable(s): ${placeholders.slice(0, 5).join(", ")}.`,
    });
  }

  if (changes.length === 0) {
    changes.push({ type: "reworded", label: "The prompt is already well formed; only light cleanup was applied." });
  }

  return { improved: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(), changes };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export type { PromptAnalysisResult, PromptFixResult };
