import type { RuntimeHandle } from "../runtime/runtime";
import type { Config } from "../config/types";
import type { TerminalConfig } from "./types";
import type { TerminalProfile } from "./terminal-profile";
import { dispatchEvent } from "./renderer";
import { renderSummary } from "./summary";
import { createPrompt, isCommand, parseCommand, HELP_TEXT } from "./input";
import { createSafeWriter } from "./safe-writer";
import { parseSkillArgs } from "./skill-args";
import { createPlanIntegration } from "../planning/integration";
import { promptPlanApproval } from "./plan-prompt";

export async function startRepl(
  runtime: RuntimeHandle,
  config: Config,
  profile: TerminalProfile = "default",
): Promise<void> {
  const terminal: TerminalConfig = {
    width: process.stdout.columns ?? 80,
    supportsColor: process.stdout.isTTY ?? false,
    isTTY: process.stdout.isTTY ?? false,
  };

  const safeWriter = createSafeWriter(profile, (s) => process.stdout.write(s));

  // Startup header
  process.stdout.write(`\nSuperAgent · ${config.model} · ${process.cwd()}\n`);

  if (!process.stdin.isTTY) {
    return;
  }

  process.stdout.write('Type a message or /help\n\n');

  const prompt = createPrompt();

  const shutdown = () => {
    prompt.close();
    process.stdout.write("\n");
  };

  process.on("SIGINT", shutdown);

  try {
    while (true) {
      const input = await prompt.question("> ");

      if (input === "") continue;

      if (isCommand(input)) {
        const parsed = parseCommand(input);
        switch (parsed.command) {
          case "/exit":
            shutdown();
            return;
          case "/help":
            process.stdout.write(`${HELP_TEXT}\n\n`);
            continue;
          case "/plan":
            {
              const task = parsed.args.trim();
              if (!task) {
                process.stdout.write("Usage: /plan <task description>\n\n");
                continue;
              }

              process.stdout.write(`📋 Generating plan for: ${task}...\n`);

              // Capture model output SILENTLY (no dispatchEvent - we only want the formatted plan, not raw JSON)
              let fullOutput = "";
              for await (const event of runtime.startTurn(`Generate a detailed execution plan for: ${task}. Format as JSON code block with: summary, steps[{order, description}], affectedFiles, verification, risks.`)) {
                if (event.type === "text") {
                  fullOutput += event.content;
                }
              }
              process.stdout.write("\n");

              // Extract JSON plan from code block (try multiple patterns)
              let plan;

              // Pattern 1: Standard ```json ... ``` (non-greedy)
              let jsonMatch = fullOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

              // Pattern 2: Try without code fences - find the largest {...} block
              if (!jsonMatch) {
                let depth = 0;
                let start = -1;
                for (let i = 0; i < fullOutput.length; i++) {
                  if (fullOutput[i] === '{') {
                    if (depth === 0) start = i;
                    depth++;
                  } else if (fullOutput[i] === '}') {
                    depth--;
                    if (depth === 0 && start !== -1) {
                      jsonMatch = [null, fullOutput.slice(start, i + 1)];
                      break;
                    }
                  }
                }
              }

              if (jsonMatch && jsonMatch[1]) {
                try {
                  // Clean up: remove trailing commas and normalize whitespace
                  const cleanJson = jsonMatch[1]
                    .trim()
                    .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
                  plan = JSON.parse(cleanJson);
                } catch (e) {
                  // Fallback
                  plan = {
                    summary: task,
                    steps: [{ order: 1, description: task }],
                    affectedFiles: [],
                    verification: [],
                    risks: ["Failed to parse structured plan"],
                  };
                }
              } else {
                // Fallback plan
                plan = {
                  summary: task,
                  steps: [
                    { order: 1, description: "Read and understand existing code" },
                    { order: 2, description: "Implement changes" },
                    { order: 3, description: "Update tests" },
                  ],
                  affectedFiles: [],
                  verification: ["Run all tests"],
                  risks: [],
                };
              }

              const decision = await promptPlanApproval(plan); // 10 min timeout (default)

              if (decision === "approve") {
                // Format the plan as CONTEXT, tell model to EXECUTE IMMEDIATELY
                // Key: We do NOT ask the model to "generate a plan" - we GIVE it the plan
                const stepsStr = (plan.steps ?? [])
                  .map((s: { order: number; description: string }) => `${s.order}. ${s.description}`)
                  .join("\n");
                const filesStr = (plan.affectedFiles ?? []).join(", ");

                const executionPrompt = `FOLLOW THIS PLAN. START EXECUTING STEP 1 NOW.

APPROVED EXECUTION PLAN:
Summary: ${plan.summary ?? task}
Steps:
${stepsStr}
Affected Files: ${filesStr}

INSTRUCTIONS:
1. Start with Step 1 immediately
2. Execute the steps one by one
3. Make ACTUAL file changes (write/edit files)
4. Do NOT stop after just reading files
5. Continue until ALL steps are fully completed

BEGIN EXECUTION NOW.`;

                for await (const event of runtime.startTurn(executionPrompt)) {
                  dispatchEvent(event, terminal);
                  if (event.type === "turn_end") {
                    safeWriter.write("\n✅ Plan execution completed.\n\n");
                  }
                }
              } else if (decision === "modify") {
                // User will type modification in the next REPL iteration
              }
              // For reject, show next prompt normally
            }
            continue;
          case "/model":
            process.stdout.write(`Model: ${config.model}\n\n`);
            continue;
          case "/skills":
            {
              const registry = runtime.getSkillRegistry();
              if (!registry || registry.skills.size === 0) {
                process.stdout.write("No skills available.\n\n");
              } else {
                const names = [...registry.skills.keys()].sort();
                process.stdout.write(`Available skills (${names.length}):\n`);
                for (const name of names) {
                  const skill = registry.skills.get(name)!;
                  process.stdout.write(`  ${name} — ${skill.manifest.description}\n`);
                }
                process.stdout.write("\n");
              }
            }
            continue;
          case "/skill":
            {
              const argsParts = parsed.args.trim().split(/\s+/).filter(Boolean);
              if (argsParts.length === 0) {
                process.stdout.write("Usage: /skill <name> [args...]\n\n");
                continue;
              }
              const skillName = argsParts[0] ?? "";
              const skillArgs = parseSkillArgs(skillName, argsParts.slice(1), runtime.getSkillRegistry());

              const diags = runtime.setActiveSkill(skillName, skillArgs);
              if (diags.length > 0) {
                for (const d of diags) {
                  process.stdout.write(`✗ ${d.message}\n`);
                }
                process.stdout.write("\n");
              } else {
                process.stdout.write(`✓ Skill "${skillName}" activated. Starting execution...\n\n`);
                // Auto-start skill execution with args as context
                const argsSummary = Object.entries(skillArgs)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(", ");
                const initialPrompt = argsSummary
                  ? `Execute the ${skillName} skill with parameters: ${argsSummary}`
                  : `Execute the ${skillName} skill`;
                for await (const event of runtime.startTurn(initialPrompt)) {
                  dispatchEvent(event, terminal);
                  if (event.type === "turn_end") {
                    safeWriter.write("\n");
                  }
                }
              }
            }
            continue;
          default:
            process.stdout.write(`Unknown command: ${parsed.command}\n\n`);
            continue;
        }
      }

      for await (const event of runtime.startTurn(input)) {
        dispatchEvent(event, terminal);

        if (event.type === "turn_end") {
          renderSummary(event.summary);
        }
      }

      safeWriter.write("\n");
    }
  } catch (err) {
    process.stderr.write(
      `REPL error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  } finally {
    shutdown();
  }
}
