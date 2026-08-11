import type {
  CategoryScore,
  Issue,
  IssueCategory,
  IssueSeverity,
  PromptAnalysisResult,
} from "./types";

const VAGUE_WORDS = [
  "thing",
  "things",
  "stuff",
  "something",
  "some things",
  "etc",
  "etc.",
  "and so on",
  "maybe",
  "kind of",
  "sort of",
  "basically",
  "whatever",
  "somehow",
  "stuff like",
];

const HEDGE_WORDS = [
  "probably",
  "perhaps",
  "i think",
  "i believe",
  "i guess",
  "might be nice",
  "could be good",
  "roughly",
  "approximately",
];

const WEAK_VERBS = [
  "make",
  "makes",
  "making",
  "do",
  "does",
  "doing",
  "get",
  "gets",
  "getting",
  "put",
  "puts",
  "use",
  "uses",
  "using",
  "give",
  "gives",
  "say",
  "says",
  "tell",
  "tells",
];

const CONTEXT_SIGNALS = [
  "for beginners",
  "for developers",
  "for experts",
  "target audience",
  "my audience",
  "my readers",
  "my customers",
  "my team",
  "my company",
  "for my",
  "for our",
  "for a",
  "i am",
  "we are",
  "i have",
  "we have",
  "in the context",
  "as a",
  "in order to",
  "so that",
  "goal",
  "objective",
  "purpose",
  "background",
];

const SPECIFICITY_SIGNALS = [
  "for example",
  "e.g.",
  "such as",
  "for instance",
  "example:",
  "here's an example",
  "sample",
  "exactly",
  "at least",
  "no more than",
  "within",
  "between",
  "limit",
  "maximum",
  "minimum",
  "only",
  "each",
  "every",
  "all",
];

const STRUCTURE_MARKERS = [
  "step 1",
  "step 2",
  "step 3",
  "first",
  "second",
  "third",
  "then",
  "next",
  "finally",
  "at the end",
  "firstly",
  "secondly",
];

const CONSTRAINT_SIGNALS = [
  "must",
  "must not",
  "do not",
  "don't",
  "never",
  "avoid",
  "only",
  "limit",
  "within",
  "maximum",
  "minimum",
  "under no circumstances",
  "cannot",
  "prohibited",
  "without",
  "except",
  "unless",
  "before",
  "after",
];

const FORMAT_SIGNALS = [
  "json",
  "markdown",
  "csv",
  "yaml",
  "xml",
  "html",
  "table",
  "list",
  "bullet",
  "paragraph",
  "paragraphs",
  "sentence",
  "sentences",
  "words",
  "word count",
  "code",
  "plain text",
  "output format",
  "respond with",
  "return",
  "format the response",
  "structure",
  "tone",
  "length",
  "concise",
  "detailed",
  "comprehensive",
];

const ROLE_SIGNALS = [
  "you are",
  "you're a",
  "you're an",
  "act as",
  "acting as",
  "as an expert",
  "as a",
  "your role",
  "role:",
  "persona",
  "pretend you are",
  "imagine you are",
  "i want you to act",
];

const CONTRADICTION_PAIRS: Array<[RegExp, RegExp]> = [
  [/always/gi, /never/gi],
  [/\bmust\b/gi, /\bmust not\b/gi],
  [/do not|don't/gi, /\bdo\b|should\b/gi],
  [/include/gi, /exclude/gi],
  [/require/gi, /forbid/gi],
  [/allow/gi, /deny/gi],
  [/start/gi, /stop/gi],
  [/begin/gi, /end/gi],
];

const SECURITY_PATTERNS: Array<[RegExp, string]> = [
  [/ignore (all |any |the )?previous instructions/gi, "ignoring previous instructions"],
  [/ignore (all |any |the )?above/gi, "ignoring instructions given above"],
  [/disregard (all |any |the )?previous/gi, "disregarding previous instructions"],
  [/forget everything/gi, "forgetting previously given context"],
  [/reveal your system prompt/gi, "asking to reveal the system prompt"],
  [/show your (system )?prompt/gi, "asking to reveal internal instructions"],
  [/jailbreak/gi, "requesting a jailbreak behavior"],
  [/dan mode/gi, "requesting DAN-style uncensored mode"],
  [/do anything now/gi, "requesting unrestricted behavior"],
  [/without (any )?restrictions/gi, "requesting unrestricted behavior"],
  [/no restrictions/gi, "requesting unrestricted behavior"],
  [/pretend you have no (rules|limits|restrictions)/gi, "asking to bypass safety rules"],
  [/password(s)?\b/gi, "handling password data"],
  [/\bssn\b|social security number/gi, "handling social security data"],
  [/credit card (number|details)/gi, "handling credit card data"],
  [/bank account (number|details)/gi, "handling bank account data"],
  [/passport number/gi, "handling passport data"],
];

const PLACEHOLDER_PATTERN =
  /\[[A-Za-z0-9][A-Za-z0-9 _-]{0,40}\]|\{[A-Za-z0-9][A-Za-z0-9 _-]{0,40}\}|<[A-Za-z0-9][A-Za-z0-9 _-]{0,40}>|YOUR_[A-Z_0-9]+|INSERT_[A-Z_0-9]+/g;

const DOMAIN_WORDS = [
  "software",
  "code",
  "coding",
  "developer",
  "programming",
  "api",
  "database",
  "backend",
  "frontend",
  "design",
  "designer",
  "ui",
  "ux",
  "marketing",
  "copywriting",
  "sales",
  "seo",
  "content",
  "article",
  "blog",
  "essay",
  "report",
  "email",
  "customer",
  "product",
  "business",
  "finance",
  "data",
  "analytics",
  "research",
  "academic",
  "legal",
  "medical",
  "health",
  "education",
  "teaching",
  "training",
];

const SEVERITY_WEIGHT: Record<IssueSeverity, number> = {
  critical: 10,
  warning: 6,
  info: 2,
};

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9'\- ]/g, " ").split(/\s+/).filter(Boolean);
}

function countSignals(text: string, signals: string[]): number {
  const lower = text.toLowerCase();
  return signals.filter((s) => lower.includes(s)).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreClarity(text: string, words: string[]): { score: number; summary: string } {
  const lower = text.toLowerCase();
  const vague = VAGUE_WORDS.filter((w) => lower.includes(w));
  const hedges = HEDGE_WORDS.filter((w) => lower.includes(w));
  const repeated = (text.match(/\b(\w{3,})\s+\1\b/gi) || []).length;

  let score = 85;
  const deductions: string[] = [];
  if (vague.length > 0) {
    score -= Math.min(30, vague.length * 8);
    deductions.push(`${vague.length} vague word group(s) (${vague.slice(0, 4).join(", ")})`);
  }
  if (hedges.length > 0) {
    score -= Math.min(20, hedges.length * 6);
    deductions.push(`${hedges.length} hedge/uncertain phrase(s)`);
  }
  if (repeated > 0) {
    score -= Math.min(15, repeated * 5);
    deductions.push("repeated words");
  }
  const avgLength =
    text.split(/\n+/).filter((s) => s.trim().length > 0).length > 0
      ? words.length / Math.max(1, text.split(/\n+/).filter((s) => s.trim().length > 0).length)
      : words.length;
  const longestSentence = Math.max(
    1,
    ...text.split(/[.!?\n]+/).map((s) => s.trim().split(/\s+/).filter(Boolean).length)
  );
  if (longestSentence > 45) {
    score -= 12;
    deductions.push("a sentence exceeds 45 words");
  }
  score = clamp(score, 5, 100);
  return {
    score,
    summary:
      score >= 80
        ? "Instructions are clear and direct."
        : `Clarity could improve: ${deductions.join("; ") || "ambiguous phrasing"} detected.`,
  };
}

function scoreContext(text: string, wordCount: number): { score: number; summary: string } {
  const signals = countSignals(text, CONTEXT_SIGNALS);
  let score = 5;
  if (signals >= 1) score += 25;
  if (signals >= 2) score += 20;
  if (signals >= 4) score += 20;
  if (wordCount < 30) score -= 15;
  if (wordCount >= 80) score += 10;
  score = clamp(score, 0, 100);
  return {
    score,
    summary:
      score >= 70
        ? "Provides sufficient background, audience and purpose."
        : score >= 40
          ? "Partial context is present; audience or purpose could be clearer."
          : "Lacks context — who it is for, the background, and the intended outcome are not stated.",
  };
}

function scoreSpecificity(
  text: string,
  words: string[]
): { score: number; summary: string } {
  const numbers = (text.match(/\d+(\.\d+)?(%|\$|€|£)?/g) || []).length;
  const signals = countSignals(text, SPECIFICITY_SIGNALS);
  const weak = words.filter((w) => WEAK_VERBS.includes(w)).length;
  const weakRatio = words.length > 0 ? weak / words.length : 0;
  const capitalized =
    (text.match(/\b[A-Z][a-zA-Z]+(\s[A-Z][a-zA-Z]+)+/g) || []).length;

  let score = 20;
  score += Math.min(30, numbers * 8);
  score += Math.min(25, signals * 7);
  score += Math.min(15, capitalized * 4);
  if (weakRatio > 0.06) score -= 15;
  if (words.length < 25) score -= 10;
  score = clamp(score, 0, 100);
  return {
    score,
    summary:
      score >= 70
        ? "Concrete details, numbers or examples make the request specific."
        : score >= 40
          ? "Some specifics present, but measurable outcomes or examples are missing."
          : "Too generic — add numbers, examples or concrete criteria.",
  };
}

function scoreStructure(text: string): { score: number; summary: string } {
  const headers = (text.match(/^#{1,4} /gm) || []).length;
  const bullets = (text.match(/^\s*[-*•] /gm) || []).length;
  const numbered = (text.match(/^\s*\d+[.)] /gm) || []).length;
  const paragraphs = text.split(/\n\s*\n/).filter((s) => s.trim().length > 0).length;
  const steps = countSignals(text, STRUCTURE_MARKERS);

  let score = 5;
  if (paragraphs >= 2) score += 25;
  if (headers >= 2) score += 25;
  if (headers >= 4) score += 10;
  if (bullets >= 2) score += 20;
  if (numbered >= 2) score += 15;
  if (steps >= 2) score += 10;
  score = clamp(score, 0, 100);
  return {
    score,
    summary:
      score >= 70
        ? "Well organized with clear sections and lists."
        : score >= 40
          ? "Partially structured; consider headers or lists."
          : "Unstructured — a wall of text without sections or lists.",
  };
}

function scoreConstraints(text: string): { score: number; summary: string } {
  const lower = text.toLowerCase();
  const constraints = CONSTRAINT_SIGNALS.filter((s) => lower.includes(s));
  const count = constraints.length;
  const boundaries = countSignals(lower, ["do not", "don't", "never", "avoid", "must not", "except", "unless"]);

  let score = 5;
  if (count >= 1) score += 25;
  if (count >= 2) score += 25;
  if (count >= 3) score += 20;
  if (count >= 5) score += 15;
  if (boundaries >= 2) score += 10;
  score = clamp(score, 0, 100);
  return {
    score,
    summary:
      score >= 70
        ? "Clear boundaries state what to do and what to avoid."
        : score >= 40
          ? "Some limits defined; negative constraints would help."
          : "No explicit constraints — the model has no boundaries to respect.",
  };
}

function scoreOutputFormat(text: string): { score: number; summary: string } {
  const lower = text.toLowerCase();
  const markers = FORMAT_SIGNALS.filter((s) => lower.includes(s));
  const hasExplicitFormat = /\b(json|markdown|csv|yaml|xml|html|table|code|plain text)\b/i.test(text);
  const hasStructureLine = /output format|respond with|return .* (as|in|with)|format the response/i.test(text);

  let score = 5;
  if (markers.length >= 1) score += 20;
  if (markers.length >= 2) score += 20;
  if (hasStructureLine) score += 25;
  if (hasExplicitFormat) score += 25;
  score = clamp(score, 0, 100);
  return {
    score,
    summary:
      score >= 70
        ? "Output format, tone and length expectations are specified."
        : score >= 40
          ? "Partial format guidance; be explicit about the expected output shape."
          : "No output format specified — the model will guess what to return.",
  };
}

function scoreRole(text: string): { score: number; summary: string } {
  const lower = text.toLowerCase();
  const roleMatches = ROLE_SIGNALS.filter((s) => lower.includes(s));
  const count = roleMatches.length;
  const expertDomain = /\bas (an? )?expert (in|on)\b/i.test(text);

  let score = 0;
  if (count >= 1) score += 65;
  if (count >= 2) score += 20;
  if (expertDomain) score += 15;
  score = clamp(score, 0, 100);
  return {
    score,
    summary:
      score >= 80
        ? "Defines a strong expert persona with a domain."
        : score >= 40
          ? "Some role definition present; add expertise and domain."
          : "No role or persona defined — add 'You are an expert in…'.",
  };
}

function detectIssues(
  text: string,
  scores: Record<string, number>,
  words: string[],
  placeholders: string[]
): Issue[] {
  const issues: Issue[] = [];
  const lower = text.toLowerCase();

  const vague = VAGUE_WORDS.filter((w) => lower.includes(w));
  if (vague.length >= 2) {
    issues.push({
      severity: "warning",
      category: "vague",
      code: "vague-instructions",
      message: `Vague wording detected (${vague.slice(0, 5).join(", ")}). Replace them with concrete, measurable terms.`,
    });
  }

  if (scores.context < 40) {
    issues.push({
      severity: "warning",
      category: "context",
      code: "missing-context",
      message: "Insufficient context: state the background, target audience and the outcome you expect.",
    });
  }

  if (scores.outputFormat < 40) {
    issues.push({
      severity: "warning",
      category: "output-format",
      code: "unclear-output-format",
      message: "Output format is unclear — specify the shape (e.g. JSON, markdown, list) and length.",
    });
  }

  if (scores.role < 40) {
    issues.push({
      severity: "info",
      category: "missing",
      code: "missing-role",
      message: "No role defined. Starting with 'You are an expert in …' improves output quality.",
    });
  }

  if (placeholders.length > 0) {
    issues.push({
      severity: "warning",
      category: "variables",
      code: "undefined-variables",
      message: `Undefined variable(s): ${placeholders.slice(0, 6).join(", ")}. Describe what each one means or provide concrete values.`,
    });
  }

  const duplicateIssues = detectDuplicates(text);
  for (const dup of duplicateIssues) {
    issues.push({ severity: "info", category: "duplicate", code: "duplicate-instruction", message: dup });
  }

  for (const [a, b] of CONTRADICTION_PAIRS) {
    const aMatches = text.match(a) || [];
    const bMatches = text.match(b) || [];
    if (aMatches.length > 0 && bMatches.length > 0) {
      issues.push({
        severity: "critical",
        category: "contradiction",
        code: "contradiction",
        message: `Contradictory instructions: "${aMatches[0]}" conflicts with "${bMatches[0]}". Resolve which rule applies.`,
      });
    }
  }

  for (const [pattern, label] of SECURITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      issues.push({
        severity: "critical",
        category: "security",
        code: "security-risk",
        message: `Potential security concern: the prompt includes language ${label}. Review before use.`,
      });
      break;
    }
  }

  if (words.length < 20) {
    issues.push({
      severity: "warning",
      category: "context",
      code: "insufficient-content",
      message: "The prompt is very short — too little information for a reliable result.",
    });
  }

  const weak = words.filter((w) => WEAK_VERBS.includes(w)).length;
  if (words.length > 0 && weak / words.length > 0.08) {
    issues.push({
      severity: "info",
      category: "specificity",
      code: "weak-verbs",
      message: "Frequent weak verbs (make, get, do, use). Prefer precise action verbs.",
    });
  }

  return issues;
}

function detectDuplicates(text: string): string[] {
  const sentences = text
    .split(/\n+|[.!?]+(?:\s|$)/)
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim())
    .filter((s) => s.split(" ").length >= 4);
  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  for (const s of sentences) {
    const count = seen.get(s) || 0;
    if (count === 1) duplicates.push(`Repeated instruction: "${truncate(s, 90)}" appears more than once.`);
    seen.set(s, count + 1);
  }
  if (duplicates.length === 0) {
    const ngrams = new Map<string, number>();
    const tokens = text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
    for (let i = 0; i <= tokens.length - 5; i++) {
      const gram = tokens.slice(i, i + 5).join(" ");
      ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
    }
    for (const [gram, count] of ngrams) {
      if (count >= 3 && !gram.includes("a a a")) {
        duplicates.push(`A phrase ("${truncate(gram, 60)}") is repeated ${count} times.`);
        break;
      }
    }
  }
  return duplicates.slice(0, 2);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function detectStrengths(
  text: string,
  scores: Record<string, number>,
  placeholders: string[]
): string[] {
  const strengths: string[] = [];
  const lower = text.toLowerCase();

  if (scores.role >= 80) strengths.push("Clear role and persona defined.");
  if (scores.constraints >= 70) strengths.push("Explicit constraints and boundaries present.");
  if (/\d+/.test(text) && countSignals(text, ["at least", "exactly", "no more than", "within", "maximum", "minimum"]) > 0)
    strengths.push("Uses concrete numbers or measurable limits.");
  if (countSignals(text, ["for example", "e.g.", "such as", "for instance"]) > 0)
    strengths.push("Includes examples that clarify expectations.");
  if (scores.outputFormat >= 70) strengths.push("Output format is clearly specified.");
  if (scores.structure >= 70) strengths.push("Well organized with sections or lists.");
  if (placeholders.length === 0 && text.length > 120) strengths.push("Self-contained: no undefined placeholders.");

  return strengths;
}

function detectImprovements(scores: Record<string, number>, issues: Issue[]): string[] {
  const improvements: string[] = [];
  if (scores.role < 40) improvements.push("Start with an explicit role: 'You are an expert in …'.");
  if (scores.context < 40) improvements.push("Add context: background, target audience and desired outcome.");
  if (scores.specificity < 40) improvements.push("Add numbers, criteria or examples to make requirements measurable.");
  if (scores.outputFormat < 40) improvements.push("Define the output format, tone and length explicitly.");
  if (scores.constraints < 40) improvements.push("Add constraints: what to avoid, limits, and non-negotiables.");
  if (scores.structure < 40) improvements.push("Structure the prompt with headings, numbered steps or bullets.");
  if (scores.clarity < 60) improvements.push("Replace vague and hedged wording with direct, concrete language.");
  for (const issue of issues) {
    if (issue.severity === "critical") improvements.push(issue.message);
  }
  const seen = new Set<string>();
  return improvements.filter((i) => (seen.has(i) ? false : (seen.add(i), true))).slice(0, 8);
}

export function analyzePrompt(content: string): PromptAnalysisResult {
  const text = content.trim();
  const words = tokenize(text);
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 1);

  const clarity = scoreClarity(text, words);
  const context = scoreContext(text, words.length);
  const specificity = scoreSpecificity(text, words);
  const structure = scoreStructure(text);
  const constraints = scoreConstraints(text);
  const outputFormat = scoreOutputFormat(text);
  const role = scoreRole(text);

  const scoreMap = {
    clarity: clarity.score,
    context: context.score,
    specificity: specificity.score,
    structure: structure.score,
    constraints: constraints.score,
    outputFormat: outputFormat.score,
    role: role.score,
  };

  const placeholders = [
    ...new Set(
      (text.match(PLACEHOLDER_PATTERN) || []).map((p) => p.replace(/^[\[{<]|[\]}>]$/g, ""))
    ),
  ].slice(0, 10);

  const issues = detectIssues(text, scoreMap, words, placeholders);
  const strengths = detectStrengths(text, scoreMap, placeholders);
  const improvements = detectImprovements(scoreMap, issues);

  const issuePenalty = issues.reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0);
  const weighted =
    clarity.score * 0.18 +
    context.score * 0.15 +
    specificity.score * 0.17 +
    structure.score * 0.13 +
    constraints.score * 0.15 +
    outputFormat.score * 0.12 +
    role.score * 0.1;
  const overall = clamp(Math.round(weighted - issuePenalty), 0, 100);

  const sectionHeaders = (text.match(/^#{1,4} [A-Za-z0-9][^\n]*$/gm) || []).map((h) =>
    h.replace(/^#{1,4}\s+/, "")
  );

  const scores: CategoryScore[] = [
    { code: "clarity", score: clarity.score, summary: clarity.summary },
    { code: "context", score: context.score, summary: context.summary },
    { code: "specificity", score: specificity.score, summary: specificity.summary },
    { code: "structure", score: structure.score, summary: structure.summary },
    { code: "constraints", score: constraints.score, summary: constraints.summary },
    { code: "outputFormat", score: outputFormat.score, summary: outputFormat.summary },
    { code: "role", score: role.score, summary: role.summary },
  ];

  const avgSentenceLength =
    sentences.length > 0
      ? Math.round((words.length / sentences.length) * 10) / 10
      : 0;

  return {
    overall,
    scores,
    issues,
    strengths,
    improvements,
    stats: {
      words: words.length,
      sentences: sentences.length,
      avgSentenceLength,
      sections: sectionHeaders,
      placeholders,
    },
  };
}

export function classifyScore(score: number): "poor" | "fair" | "good" | "excellent" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

export type { IssueCategory };
