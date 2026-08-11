import type { AnswerMap, AnswerValue, Blueprint, BuildResult, GoalQuestion, QuestionSet } from "./types";
import { MissingAnswersError } from "./types";

function toStringValue(value: AnswerValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return value.join(", ");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapToBlueprint(questionSet: QuestionSet, answers: AnswerMap): Blueprint {
  const get = (id: string) => toStringValue(answers[id]);

  const context: string[] = [];
  const detectedBusiness = questionSet.insights.detectedBusinessType;
  if (detectedBusiness) context.push(`The subject is a ${detectedBusiness}.`);
  const businessType = get("businessType");
  if (businessType) context.push(`The subject is a ${businessType}.`);
  const country = questionSet.insights.detectedCountry ?? get("country");
  if (country) context.push(`Targeting the ${country} market.`);
  const extraContext = get("context");
  if (extraContext) context.push(extraContext);

  const audience = get("audience") ? [get("audience") as string] : [];

  const constraints: string[] = [];
  const tone = get("tone");
  if (tone) constraints.push(`Use a ${tone.toLowerCase()} tone throughout.`);
  if (questionSet.insights.category !== "coding") {
    const language = get("language");
    if (language) constraints.push(`Write the output in ${language}.`);
  }
  const budget = get("budget");
  if (budget && !/^none$/i.test(budget)) constraints.push(`Stay within a budget of: ${budget}.`);
  const deadline = get("deadline");
  if (deadline) constraints.push(`Deliverable is needed by: ${deadline}.`);
  const freeConstraints = get("constraints");
  if (freeConstraints) constraints.push(freeConstraints);

  const requirements: string[] = [];
  const goalMetric = get("goalMetric");
  if (goalMetric) requirements.push(`Primary objective: ${goalMetric.toLowerCase()}.`);
  const contentType = get("contentType");
  if (contentType) requirements.push(`Produce the following: ${contentType}.`);
  const genre = get("genre");
  if (genre) requirements.push(`Format the piece as a ${genre.toLowerCase()}.`);
  const stack = get("stack");
  if (stack) requirements.push(`Use the ${stack} stack.`);
  const topicLevel = get("topicLevel");
  if (topicLevel) requirements.push(`Adjust depth for a ${topicLevel.toLowerCase()} audience.`);
  const style = get("style");
  if (style) requirements.push(`Visual direction: ${style.toLowerCase()}.`);
  const include = get("include");
  if (include) requirements.push(`Must include: ${include}.`);
  const platforms = [...questionSet.insights.detectedPlatforms];
  const selectedPlatforms = answers.platform;
  if (Array.isArray(selectedPlatforms)) platforms.push(...selectedPlatforms.map((p) => p.trim()).filter(Boolean));
  if (platforms.length > 0) requirements.push(`Optimize the result for: ${platforms.join(", ")}.`);

  const outputFormat: string[] = [];
  const format = get("outputFormat");
  if (format) outputFormat.push(`Deliver the result as a ${format.toLowerCase()}.`);
  const length = get("length");
  if (length) outputFormat.push(`Target length: ${length.toLowerCase()}.`);
  const example = get("example");
  if (example) outputFormat.push(`Style reference:\n${example}`);

  return {
    goal: questionSet.goal,
    context,
    audience,
    constraints,
    requirements,
    outputFormat,
  };
}

function bulletList(items: string[]): string {
  if (items.length === 0) return "- None — make reasonable assumptions and state them clearly.\n";
  return items.map((item) => `- ${item}`).join("\n") + "\n";
}

function section(title: string, body: string): string {
  return `# ${title}\n${body}`;
}

const OPENINGS = [
  "Act as an experienced {field} specialist. Read the full brief below and deliver exactly what is requested.",
  "You are a senior {field} consultant. Follow the brief carefully and produce a polished, ready-to-use result.",
  "Approach the following brief as a trusted {field} expert. Deliver the requested output with precision and clarity.",
];

const CLOSINGS = [
  "If any detail is still ambiguous, make a sensible assumption, note it in one line, and proceed.\nProduce the output now — no preamble, no explanations.",
  "If any required detail is missing, state your assumption in a single line before the result, then deliver.\nStart directly with the deliverable.",
  "Complete the task in full. Do not summarize the brief back — produce the deliverable immediately.",
];

function buildPromptText(questionSet: QuestionSet, blueprint: Blueprint, variation: number): string {
  const opening = OPENINGS[variation % OPENINGS.length].replace("{field}", questionSet.insights.categoryLabel);
  const closing = CLOSINGS[variation % CLOSINGS.length];

  const sections: string[] = [
    section("Goal", `${blueprint.goal}\n`),
    section("Context", `${blueprint.context.length > 0 ? blueprint.context.join("\n") : "No additional context provided — proceed with the goal as described."}\n`),
    section("Audience", blueprint.audience.length > 0 ? bulletList(blueprint.audience) : "- General audience.\n"),
  ];

  const constraintText = bulletList(blueprint.constraints);
  const requirementText = bulletList(blueprint.requirements);
  const outputText = bulletList(blueprint.outputFormat);

  if (variation % 2 === 0) {
    sections.push(section("Constraints", constraintText));
    sections.push(section("Requirements", requirementText));
  } else {
    sections.push(section("Requirements", requirementText));
    sections.push(section("Constraints", constraintText));
  }

  sections.push(section("Output Format", outputText));

  return `${opening}\n\n${sections.join("\n")}\n${closing}`;
}

function titleFromGoal(goal: string): string {
  const normalized = goal.trim().replace(/\s+/g, " ").replace(/[.!?،؛]+$/u, "");
  if (normalized.length === 0) return "Autopilot prompt";
  return normalized.length > 64 ? `${normalized.slice(0, 61).trimEnd()}...` : normalized;
}

const MAX_GOAL_LENGTH = 2000;

export class PromptAutopilotEngine {
  private static validateGoal(goal: string): string {
    const text = typeof goal === "string" ? goal.trim() : "";
    if (text.length === 0) throw new Error("Goal is required");
    if (text.length > MAX_GOAL_LENGTH) throw new Error("Goal is too long");
    return text;
  }

  private static validateAnswers(answers: unknown): AnswerMap {
    if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
      throw new Error("Answers are required");
    }
    const map: AnswerMap = {};
    for (const [key, value] of Object.entries(answers as Record<string, unknown>)) {
      if (typeof value === "string") {
        map[key] = value;
      } else if (Array.isArray(value)) {
        const strings = value.filter((v): v is string => typeof v === "string");
        map[key] = strings;
      }
    }
    return map;
  }

  private static checkRequired(questions: GoalQuestion[], answers: AnswerMap): void {
    const empty = (value: AnswerValue | undefined) =>
      value === undefined ||
      (Array.isArray(value) ? value.length === 0 || value.every((v) => v.trim() === "") : value.trim() === "");
    const missing = questions.filter((q) => q.required && empty(answers[q.id])).map((q) => q.id);
    if (missing.length > 0) throw new MissingAnswersError(missing);
  }

  static build(questionSet: QuestionSet, answers: unknown, variation: number): BuildResult {
    const answerMap = PromptAutopilotEngine.validateAnswers(answers);
    if (!Number.isInteger(variation) || variation < 0) {
      throw new Error("Invalid variation");
    }
    PromptAutopilotEngine.checkRequired(questionSet.questions, answerMap);
    const normalized = PromptAutopilotEngine.normalizeUnanswered(questionSet, answerMap);
    const blueprint = mapToBlueprint(questionSet, normalized);
    return {
      title: titleFromGoal(questionSet.goal),
      summary: questionSet.summary,
      blueprint,
      prompt: buildPromptText(questionSet, blueprint, variation),
      variation,
    };
  }

  private static normalizeUnanswered(questionSet: QuestionSet, answers: AnswerMap): AnswerMap {
    const copy: AnswerMap = { ...answers };
    for (const q of questionSet.questions) {
      const value = copy[q.id];
      if (value === undefined && q.id === "platform") {
        const detected = questionSet.insights.detectedPlatforms;
        if (detected.length > 0) copy[q.id] = detected;
      }
    }
    return copy;
  }
}