import { tool } from "ai";
import { z } from "zod";

export const frontendAnalysisInputSchema = z.object({
  topic: z
    .string()
    .min(2)
    .describe("The frontend topic or skill the user wants analyzed"),

  level: z
    .enum(["beginner", "intermediate", "advanced"])
    .describe("The user's current experience level"),
});

export type FrontendAnalysisInput = z.infer<
  typeof frontendAnalysisInputSchema
>;

export type FrontendAnalysisOutput = {
  topic: string;
  score: number;
  level: "Developing" | "Good" | "Excellent";
  strengths: string[];
  recommendations: string[];
};

export const analyzeFrontendSkill = tool({
  description:
    "Analyze a frontend development topic or skill. Use this tool whenever the user asks for a frontend skill analysis, score, assessment, strengths, weaknesses, or recommendations.",

  inputSchema: frontendAnalysisInputSchema,

  execute: async ({
    topic,
    level,
  }): Promise<FrontendAnalysisOutput> => {
    // Intentional failure path for testing FE-07 output-error UI.
    if (topic.toLowerCase().includes("force error")) {
      throw new Error("Frontend analysis failed intentionally.");
    }

    // Delay makes lifecycle states visible during testing.
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });

    const scores = {
      beginner: 58,
      intermediate: 78,
      advanced: 91,
    } as const;

    const score = scores[level];

    const resultLevel: FrontendAnalysisOutput["level"] =
      score >= 90
        ? "Excellent"
        : score >= 75
          ? "Good"
          : "Developing";

    return {
      topic,
      score,
      level: resultLevel,

      strengths: [
        `Understanding of ${topic} fundamentals`,
        "Awareness of modern frontend development practices",
        "Ability to apply concepts in practical projects",
      ],

      recommendations: [
        `Build a focused mini project using ${topic}`,
        "Practice accessibility and keyboard interaction",
        "Add automated tests for important UI behaviour",
      ],
    };
  },
});

export const frontendTools = {
  analyzeFrontendSkill,
};

export type FrontendTools = typeof frontendTools;