export type QuestionType = "text" | "select" | "multiSelect";

export type QuestionSection = "context" | "audience" | "constraints" | "requirements" | "output";

export interface GoalQuestion {
  id: string;
  section: QuestionSection;
  type: QuestionType;
  prompt: string;
  options?: string[];
  placeholder?: string;
  required: boolean;
}

export type GoalCategory =
  | "marketing"
  | "food"
  | "writing"
  | "coding"
  | "education"
  | "creative"
  | "business"
  | "social"
  | "general";

export interface GoalInsights {
  category: GoalCategory;
  categoryLabel: string;
  detectedPlatforms: string[];
  detectedCountry?: string;
  detectedBusinessType?: string;
}

export interface QuestionSet {
  goal: string;
  summary: string;
  insights: GoalInsights;
  questions: GoalQuestion[];
}

export interface Blueprint {
  goal: string;
  context: string[];
  audience: string[];
  constraints: string[];
  requirements: string[];
  outputFormat: string[];
}

export interface BuildResult {
  title: string;
  summary: string;
  blueprint: Blueprint;
  prompt: string;
  variation: number;
}

export type AnswerValue = string | string[];

export type AnswerMap = Record<string, AnswerValue>;

export class MissingAnswersError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super("Some required questions are missing answers");
    this.missing = missing;
  }
}