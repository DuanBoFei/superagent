import { parseReviewOutput } from "./parser";
import { buildReviewPrompt } from "./prompt";
import type { ReviewInput, ReviewResult } from "./types";

export type ReviewRequester = (prompt: string) => Promise<string>;

export interface RunCodeReviewOptions {
  requester: ReviewRequester;
}

export async function runCodeReview(input: ReviewInput, options: RunCodeReviewOptions): Promise<ReviewResult> {
  const prompt = buildReviewPrompt(input);
  const output = await options.requester(prompt);
  return parseReviewOutput(output);
}
