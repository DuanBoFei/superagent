import type { ReviewFinding } from "../review/types";

export function renderReviewFindingsTable(findings: ReviewFinding[]): string {
  if (findings.length === 0) {
    return "No review findings.";
  }

  return [
    "| Severity | Category | Location | Description | Recommendation |",
    "|---|---|---|---|---|",
    ...findings.map((finding) =>
      [
        finding.severity,
        finding.category,
        formatLocation(finding),
        finding.description,
        finding.recommendation,
      ].join(" | "),
    ).map((row) => `| ${row} |`),
  ].join("\n");
}

function formatLocation(finding: ReviewFinding): string {
  if (!finding.file) {
    return "—";
  }
  return finding.line === undefined ? finding.file : `${finding.file}:${finding.line}`;
}
