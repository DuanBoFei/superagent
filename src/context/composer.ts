import type { ContextMessage, Prompt, PromptContext } from "./types";
import { SYSTEM_PROMPT } from "./system-prompt";
import { loadRules } from "./rules-loader";
import { formatToolDefs } from "./tool-defs-layer";
import { buildHistory } from "./history-layer";
import { compact } from "./compactor";
import { estimateTokens } from "./token-counter";

const MAX_COMPACTION_ROUNDS = 3;

export function composePrompt(
  messages: ContextMessage[],
  context: PromptContext,
): Prompt {
  // Layer 1: Static system prompt
  let system = SYSTEM_PROMPT;

  // Layer 1.5: Repo-map context block (if available)
  if (context.repoMapText) {
    system += `\n\n${context.repoMapText}`;
  }

  // Layer 2: CLAUDE.md rules (if present)
  const rules = loadRules(context.rulesFilePath);
  if (rules) {
    system += "\n\n" + rules;
  }

  // Layer 3: Tool definitions
  const toolDefs = formatToolDefs(context.toolDefinitions);
  if (toolDefs) {
    system += "\n\n" + toolDefs;
  }

  let currentMessages = [...messages];
  let compacted = false;

  // Count total tokens
  let totalTokens = estimateTokens(system);
  for (const msg of currentMessages) {
    totalTokens += estimateTokens(msg.content);
    if (msg.toolResults) {
      for (const tr of msg.toolResults) {
        totalTokens += estimateTokens(tr.output);
      }
    }
  }

  // Check threshold: >= 80% of context window
  const threshold = Math.floor(context.contextWindowTokens * 0.8);

  if (totalTokens >= threshold && currentMessages.length > 1) {
    let round = 0;

    while (totalTokens >= threshold && round < MAX_COMPACTION_ROUNDS) {
      const result = compact(currentMessages);
      currentMessages = result.messages;
      compacted = true;
      round++;

      // Recalculate tokens
      totalTokens = estimateTokens(system);
      for (const msg of currentMessages) {
        totalTokens += estimateTokens(msg.content);
        if (msg.toolResults) {
          for (const tr of msg.toolResults) {
            totalTokens += estimateTokens(tr.output);
          }
        }
      }

      if (currentMessages.length <= 1) break;
    }

    // Hard truncate: drop oldest messages if still over threshold
    while (totalTokens >= threshold && currentMessages.length > 1) {
      currentMessages = currentMessages.slice(1);
      totalTokens = estimateTokens(system);
      for (const msg of currentMessages) {
        totalTokens += estimateTokens(msg.content);
        if (msg.toolResults) {
          for (const tr of msg.toolResults) {
            totalTokens += estimateTokens(tr.output);
          }
        }
      }
    }
  }

  return {
    system,
    messages: currentMessages,
    estimatedTokens: totalTokens,
    compacted,
  };
}
