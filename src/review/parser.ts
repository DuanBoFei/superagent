import { REVIEW_CATEGORIES, REVIEW_SEVERITIES, type ReviewCategory, type ReviewFinding, type ReviewResult, type ReviewSeverity } from "./types";

export function parseReviewOutput(rawOutput: string): ReviewResult {
  if (rawOutput.trim() === "") {
    return inconclusive(rawOutput, "Reviewer output was empty", "Reviewer output was empty, so approval cannot be trusted");
  }

  try {
    return parseJson(rawOutput);
  } catch {
    const fallbackFindings = parseFallbackFindings(rawOutput);
    if (fallbackFindings.length > 0) {
      return {
        approved: !fallbackFindings.some((finding) => finding.severity === "blocking"),
        summary: `Parsed ${fallbackFindings.length} fallback finding${fallbackFindings.length === 1 ? "" : "s"}`,
        findings: fallbackFindings,
        rawOutput,
      };
    }

    return inconclusive(
      rawOutput,
      "Reviewer output was malformed",
      "Reviewer output could not be parsed as JSON or fallback findings",
    );
  }
}

function parseJson(rawOutput: string): ReviewResult {
  const parsed = JSON.parse(rawOutput) as {
    approved?: unknown;
    summary?: unknown;
    findings?: unknown;
  };

  if (typeof parsed.approved !== "boolean" || typeof parsed.summary !== "string" || !Array.isArray(parsed.findings)) {
    throw new Error("Invalid review result");
  }

  return {
    approved: parsed.approved,
    summary: parsed.summary,
    findings: parsed.findings.map(parseFinding),
    rawOutput,
  };
}

function parseFinding(finding: unknown): ReviewFinding {
  if (!finding || typeof finding !== "object") {
    throw new Error("Invalid finding");
  }

  const candidate = finding as Record<string, unknown>;
  if (
    !isReviewSeverity(candidate.severity) ||
    !isReviewCategory(candidate.category) ||
    typeof candidate.description !== "string" ||
    typeof candidate.recommendation !== "string"
  ) {
    throw new Error("Invalid finding");
  }

  const parsed: ReviewFinding = {
    severity: candidate.severity,
    category: candidate.category,
    description: candidate.description,
    recommendation: candidate.recommendation,
  };

  if (typeof candidate.file === "string") {
    parsed.file = candidate.file;
  }
  if (typeof candidate.line === "number") {
    parsed.line = candidate.line;
  }

  return parsed;
}

function parseFallbackFindings(rawOutput: string): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const pattern = /^(BLOCKING|WARNING|INFO)\s+([a-z-]+):\s+(.+)$/gim;
  for (const match of rawOutput.matchAll(pattern)) {
    const severity = match[1]?.toLowerCase();
    const category = match[2];
    const description = match[3];
    if (!isReviewSeverity(severity) || !isReviewCategory(category) || !description) {
      continue;
    }
    findings.push({
      severity,
      category,
      description,
      recommendation: `Address the reported ${category} issue`,
    });
  }
  return findings;
}

function inconclusive(rawOutput: string, summary: string, description: string): ReviewResult {
  return {
    approved: false,
    summary,
    findings: [
      {
        severity: "blocking",
        category: "correctness",
        description,
        recommendation: "Run review again and require structured output",
      },
    ],
    rawOutput,
  };
}

function isReviewSeverity(value: unknown): value is ReviewSeverity {
  return typeof value === "string" && REVIEW_SEVERITIES.includes(value as ReviewSeverity);
}

function isReviewCategory(value: unknown): value is ReviewCategory {
  return typeof value === "string" && REVIEW_CATEGORIES.includes(value as ReviewCategory);
}
