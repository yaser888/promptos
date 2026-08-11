import { analyzeGoal } from "@/engine/prompt-autopilot/goal-analyzer";
import { PromptAutopilotEngine } from "@/engine/prompt-autopilot/prompt-builder";
import type { BuildResult, QuestionSet } from "@/engine/prompt-autopilot/types";

export class PromptAutopilotService {
  static analyze(goal: string): QuestionSet {
    const text = typeof goal === "string" ? goal.trim() : "";
    if (text.length === 0) throw new Error("Goal is required");
    if (text.length > 2000) throw new Error("Goal is too long");
    return analyzeGoal(text);
  }

  static build(goal: string, answers: unknown, variation: number): BuildResult {
    const questionSet = this.analyze(goal);
    return PromptAutopilotEngine.build(questionSet, answers, variation);
  }
}