import type { CompactionSummary, ContextMessage } from "./types";
import { estimateTokens } from "./token-counter";

export interface CompactionResult {
  messages: ContextMessage[];
  summary: CompactionSummary;
  tokensBefore: number;
  tokensAfter: number;
}

export function compact(messages: ContextMessage[]): CompactionResult {
  if (messages.length <= 1) {
    return {
      messages: [...messages],
      summary: {
        modifiedFiles: [],
        errorsEncountered: [],
        keyDecisions: [],
        currentGoal: "",
        turnsSummarized: 0,
      },
      tokensBefore: countTokens(messages),
      tokensAfter: countTokens(messages),
    };
  }

  const tokensBefore = countTokens(messages);

  // Select oldest 50% by timestamp
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  const cutoff = Math.floor(sorted.length / 2);
  const oldestBlock = sorted.slice(0, cutoff);
  const newestBlock = sorted.slice(cutoff);

  // Extract key information
  const summary = extractSummary(oldestBlock, newestBlock);

  // Replace oldest messages with summary
  const lastOld = oldestBlock[oldestBlock.length - 1]!;
  const summaryMessage: ContextMessage = {
    role: "assistant",
    content: formatSummaryText(summary),
    timestamp: lastOld.timestamp,
  };

  const result = [summaryMessage, ...newestBlock];
  const tokensAfter = countTokens(result);

  return { messages: result, summary, tokensBefore, tokensAfter };
}

function extractSummary(
  oldest: ContextMessage[],
  newest: ContextMessage[],
): CompactionSummary {
  const modifiedFiles: string[] = [];
  const errorsEncountered: string[] = [];
  const keyDecisions: string[] = [];
  let currentGoal = "";

  for (const msg of oldest) {
    // Extract file paths from tool results
    if (msg.toolResults) {
      for (const tr of msg.toolResults) {
        const fileMatches = extractFilePaths(tr.output);
        for (const f of fileMatches) {
          if (!modifiedFiles.includes(f)) modifiedFiles.push(f);
        }
        if (tr.output.toLowerCase().includes("error")) {
          const errLine = tr.output
            .split("\n")
            .find((l) => l.toLowerCase().includes("error"));
          if (errLine && !errorsEncountered.includes(errLine)) {
            errorsEncountered.push(errLine.slice(0, 200));
          }
        }
      }
    }

    // Extract modified files from Write/Edit operations
    const writeMatch = msg.content.match(/\[(?:Write|Edit)\]\s*(\S+)/);
    const filePath = writeMatch?.[1];
    if (filePath && !modifiedFiles.includes(filePath)) {
      modifiedFiles.push(filePath);
    }

    // Extract file paths mentioned in content
    for (const file of extractFilePaths(msg.content)) {
      if (!modifiedFiles.includes(file)) modifiedFiles.push(file);
    }

    // Extract errors
    if (
      msg.role === "assistant" &&
      msg.content.toLowerCase().includes("error")
    ) {
      const errLine = msg.content
        .split("\n")
        .find((l) => l.toLowerCase().includes("error"));
      if (errLine && !errorsEncountered.includes(errLine)) {
        errorsEncountered.push(errLine.slice(0, 200));
      }
    }

    // Extract user approvals/decisions
    if (msg.role === "user") {
      const trimmed = msg.content.slice(0, 200);
      if (
        trimmed.toLowerCase().includes("yes") ||
        trimmed.toLowerCase().includes("approve") ||
        trimmed.toLowerCase().includes("deny") ||
        trimmed.toLowerCase().includes("reject")
      ) {
        keyDecisions.push(trimmed);
      }
    }
  }

  // Find current goal from the last user message in entire conversation
  for (let i = newest.length - 1; i >= 0; i--) {
    const msg = newest[i]!;
    if (msg.role === "user") {
      currentGoal = msg.content.slice(0, 300);
      break;
    }
  }
  if (!currentGoal) {
    for (let i = oldest.length - 1; i >= 0; i--) {
      const msg = oldest[i]!;
      if (msg.role === "user") {
        currentGoal = msg.content.slice(0, 300);
        break;
      }
    }
  }

  return {
    modifiedFiles,
    errorsEncountered,
    keyDecisions,
    currentGoal,
    turnsSummarized: oldest.length,
  };
}

function extractFilePaths(text: string): string[] {
  const paths: string[] = [];
  const regex =
    /(?:\/[\w./-]+|[\w./-]*\.(?:ts|tsx|js|jsx|py|json|yaml|yml|md|toml|go|rs|java|c|cpp|h|html|css))/gi;
  const matches = text.match(regex);
  if (matches) {
    for (const m of matches) {
      if (m.length > 2 && !paths.includes(m)) paths.push(m);
    }
  }
  return paths.slice(0, 10);
}

function formatSummaryText(summary: CompactionSummary): string {
  const lines: string[] = ["## Previous conversation summary", ""];

  if (summary.modifiedFiles.length > 0) {
    lines.push(
      `- Modified files: ${summary.modifiedFiles.slice(0, 20).join(", ")}`,
    );
  }
  if (summary.errorsEncountered.length > 0) {
    lines.push(
      `- Errors encountered: ${summary.errorsEncountered.slice(0, 5).join("; ")}`,
    );
  }
  if (summary.keyDecisions.length > 0) {
    lines.push(
      `- Key decisions: ${summary.keyDecisions.slice(0, 5).join("; ")}`,
    );
  }
  if (summary.currentGoal) {
    lines.push(`- Current goal: ${summary.currentGoal}`);
  }
  lines.push(`- ${summary.turnsSummarized} turns summarized`);

  return lines.join("\n") + "\n";
}

function countTokens(messages: ContextMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg.content);
    if (msg.toolResults) {
      for (const tr of msg.toolResults) {
        total += estimateTokens(tr.output);
      }
    }
  }
  return total;
}
