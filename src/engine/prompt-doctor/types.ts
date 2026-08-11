export type IssueCategory =
  | "vague"
  | "context"
  | "missing"
  | "contradiction"
  | "duplicate"
  | "output-format"
  | "variables"
  | "security"
  | "specificity"
  | "structure";

export type IssueSeverity = "critical" | "warning" | "info";

export interface Issue {
  severity: IssueSeverity;
  category: IssueCategory;
  code: string;
  message: string;
}

export interface ScoreBand {
  label: string;
  detail: string;
}

export interface CategoryScore {
  code: string;
  score: number;
  summary: string;
}

export interface PromptAnalysisResult {
  overall: number;
  scores: CategoryScore[];
  issues: Issue[];
  strengths: string[];
  improvements: string[];
  stats: {
    words: number;
    sentences: number;
    avgSentenceLength: number;
    sections: string[];
    placeholders: string[];
  };
}

export interface FixChange {
  type: "added" | "removed" | "reworded" | "defined";
  label: string;
}

export interface PromptFixResult {
  improved: string;
  changes: FixChange[];
}
