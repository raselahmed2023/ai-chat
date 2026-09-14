import type {
  FrontendAnalysisInput,
  FrontendAnalysisOutput,
} from "@/lib/tools/frontend-analysis";

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

type FrontendAnalysisCardProps = {
  state: ToolState;
  input?: Partial<FrontendAnalysisInput>;
  output?: FrontendAnalysisOutput;
  errorText?: string;
};

export default function FrontendAnalysisCard({
  state,
  input,
  output,
  errorText,
}: FrontendAnalysisCardProps) {
  if (state === "input-streaming") {
    return (
      <div className="tool-card tool-card-streaming">
        <div className="tool-state-heading">
          <span className="tool-spinner" />
          <div>
            <p className="tool-label">Frontend Analysis</p>
            <h3>Preparing analysis…</h3>
          </div>
        </div>

        <p>
          The AI is generating the information required to
          run the analysis tool.
        </p>
      </div>
    );
  }

  if (state === "input-available") {
    return (
      <div className="tool-card tool-card-input">
        <div>
          <p className="tool-label">Tool input ready</p>
          <h3>Analyzing frontend skill</h3>
        </div>

        <dl className="tool-input-grid">
          <div>
            <dt>Topic</dt>
            <dd>{input?.topic ?? "Preparing..."}</dd>
          </div>

          <div>
            <dt>Experience</dt>
            <dd>{input?.level ?? "Preparing..."}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div
        className="tool-card tool-card-error"
        role="alert"
      >
        <div className="error-icon" aria-hidden="true">
          !
        </div>

        <div>
          <p className="tool-label">Analysis failed</p>

          <h3>Unable to complete the assessment</h3>

          <p>
            {errorText ||
              "The frontend analysis tool could not complete this request."}
          </p>

          <p className="error-help">
            Try changing the topic and submitting the request
            again.
          </p>
        </div>
      </div>
    );
  }

  if (!output) {
    return null;
  }

  return (
    <article className="tool-card tool-card-result">
      <div className="result-header">
        <div>
          <p className="tool-label">Analysis complete</p>
          <h3>{output.topic}</h3>
        </div>

        <div
          className="score-circle"
          aria-label={`Score ${output.score} out of 100`}
        >
          <strong>{output.score}</strong>
          <span>/100</span>
        </div>
      </div>

      <div className="level-row">
        <span>Assessment</span>
        <strong>{output.level}</strong>
      </div>

      <div className="score-track">
        <div
          className="score-progress"
          style={{
            width: `${Math.min(
              Math.max(output.score, 0),
              100
            )}%`,
          }}
        />
      </div>

      <div className="analysis-columns">
        <section>
          <h4>Strengths</h4>

          <ul className="strength-list">
            {output.strengths.map((strength) => (
              <li key={strength}>
                <span aria-hidden="true">✓</span>
                {strength}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>Recommendations</h4>

          <ol className="recommendation-list">
            {output.recommendations.map(
              (recommendation, index) => (
                <li key={recommendation}>
                  <span>{index + 1}</span>
                  {recommendation}
                </li>
              )
            )}
          </ol>
        </section>
      </div>
    </article>
  );
}