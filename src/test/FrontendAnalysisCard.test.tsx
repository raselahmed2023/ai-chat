import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FrontendAnalysisCard from "@/components/FrontendAnalysisCard";

const input = {
  topic: "React",
  level: "intermediate" as const,
};

const output = {
  topic: "React",
  score: 78,
  level: "Good" as const,
  strengths: [
    "Understanding of React fundamentals",
    "Awareness of modern frontend development practices",
  ],
  recommendations: [
    "Build a focused mini project using React",
    "Practice accessibility and keyboard interaction",
  ],
};

describe("FrontendAnalysisCard", () => {
  it("renders a completed frontend analysis result", () => {
    render(
      <FrontendAnalysisCard
        state="output-available"
        input={input}
        output={output}
      />
    );

    expect(
      screen.getByText("Analysis complete", {
        exact: true,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "React",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Score 78 out of 100")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Good", {
        exact: true,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Understanding of React fundamentals"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Build a focused mini project using React"
      )
    ).toBeInTheDocument();
  });

  it("renders the tool error state", () => {
    render(
      <FrontendAnalysisCard
        state="output-error"
        input={input}
        errorText="Frontend analysis failed intentionally."
      />
    );

    expect(
      screen.getByRole("alert")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Analysis failed", {
        exact: true,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /unable to complete the assessment/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Frontend analysis failed intentionally.",
        {
          exact: true,
        }
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /try changing the topic and submitting the request again/i
      )
    ).toBeInTheDocument();
  });
});