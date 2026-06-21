import * as readline from "node:readline";
import type { ExecutionPlan } from "../planning/types";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

export type PlanDecision = "approve" | "reject" | "modify";

export async function promptPlanApproval(
  plan: ExecutionPlan,
  timeoutMs = 600_000, // 10 minutes default
): Promise<PlanDecision> {
  const header = `${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`;
  process.stdout.write(`\n${header}\n`);
  process.stdout.write(`${BLUE}📋 EXECUTION PLAN${RESET}\n`);
  process.stdout.write(`${header}\n\n`);

  // Summary
  if (plan.summary) {
    process.stdout.write(`${YELLOW}Summary:${RESET} ${plan.summary}\n\n`);
  }

  // Steps
  const steps = plan.steps ?? [];
  process.stdout.write(`${YELLOW}Steps (${steps.length}):${RESET}\n`);
  for (const step of steps) {
    process.stdout.write(`  ${step.order}. ${step.description}\n`);
  }
  process.stdout.write("\n");

  // Affected Files
  const affected = plan.affectedFiles ?? [];
  if (affected.length > 0) {
    process.stdout.write(`${YELLOW}Affected Files (${affected.length}):${RESET}\n`);
    for (const file of affected.slice(0, 8)) {
      process.stdout.write(`  - ${file}\n`);
    }
    if (affected.length > 8) {
      process.stdout.write(`  ... +${affected.length - 8} more\n`);
    }
    process.stdout.write("\n");
  }

  // Risks
  const risks = plan.risks ?? [];
  if (risks.length > 0) {
    process.stdout.write(`${YELLOW}Risks (${risks.length}):${RESET}\n`);
    for (const risk of risks) {
      const riskStr = typeof risk === "string" ? risk : JSON.stringify(risk);
      process.stdout.write(`  ⚠️  ${riskStr}\n`);
    }
    process.stdout.write("\n");
  }

  // Verification
  const verification = plan.verification ?? [];
  if (verification.length > 0) {
    process.stdout.write(`${YELLOW}Verification (${verification.length}):${RESET}\n`);
    for (const v of verification) {
      const vStr = typeof v === "string" ? v : JSON.stringify(v);
      process.stdout.write(`  ✓ ${vStr}\n`);
    }
    process.stdout.write("\n");
  }

  return new Promise((resolve) => {
    const timeoutSeconds = Math.round(timeoutMs / 1000);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Create a FRESH readline interface to avoid conflict with REPL
    // We use terminal:false to disable echo (prevents double input)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      rl.close();
    };

    process.stdout.write(`${GRAY}Press:${RESET} ${GREEN}A${RESET}pprove | ${YELLOW}M${RESET}odify | R${RESET}eject  ${GRAY}(then Enter)${RESET}\n`);
    process.stdout.write(`${GRAY}Timeout:${RESET} ${timeoutSeconds}s\n`);
    process.stdout.write(`> `);

    // Start timeout AFTER showing the prompt
    timeoutId = setTimeout(() => {
      cleanup();
      process.stdout.write("\n⏱️  (auto-reject: timeout)\n\n");
      resolve("reject");
    }, timeoutMs);

    // Use 'line' event from readline
    rl.once("line", (line) => {
      const choice = line.trim().toLowerCase().charAt(0);
      cleanup();

      if (choice === "a") {
        process.stdout.write("\n✅ Plan approved! Starting execution...\n\n");
        resolve("approve");
      } else if (choice === "m") {
        process.stdout.write("\n✏️ Modify plan - please describe your changes:\n\n");
        resolve("modify");
      } else if (choice === "r") {
        process.stdout.write("\n❌ Plan rejected.\n\n");
        resolve("reject");
      } else {
        process.stdout.write(`\n❌ Unknown option "${choice}". Plan rejected.\n\n`);
        resolve("reject");
      }
    });
  });
}
