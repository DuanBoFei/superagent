import type {
  AgentRole,
  OrchestrationRun,
  OrchestrationStatus,
  PhaseInput,
  PhaseLifecycleEvent,
  PhaseResult,
  PhaseSummary,
  ReviewFinding,
} from "./types";

export type PhaseRunner = (input: PhaseInput) => Promise<PhaseResult>;

export interface OrchestratorOptions {
  runId?: string;
  runPhase: PhaseRunner;
  now?: () => Date;
  emit?: (event: { type: "agent:phase"; runId: string; role: AgentRole; lifecycle: PhaseLifecycleEvent }) => void;
}

const PHASES: AgentRole[] = ["explore", "implement", "review"];

export async function runMultiAgentOrchestration(
  prompt: string,
  options: OrchestratorOptions,
): Promise<OrchestrationRun> {
  const now = options.now ?? (() => new Date());
  const run: OrchestrationRun = {
    id: options.runId ?? crypto.randomUUID(),
    prompt,
    status: "running",
    phases: [],
    startedAt: now(),
    updatedAt: now(),
  };

  let findings: string[] = [];
  let changedFiles: string[] = [];
  let tests: string[] = [];

  for (const role of PHASES) {
    options.emit?.({ type: "agent:phase", runId: run.id, role, lifecycle: "start" });
    try {
      const result = await options.runPhase({ prompt, role, findings, changedFiles, tests });
      run.phases.push(result);
      run.updatedAt = now();

      if (result.status === "failed" || result.status === "interrupted") {
        options.emit?.({ type: "agent:phase", runId: run.id, role, lifecycle: "result" });
        run.status = result.status === "interrupted" ? "interrupted" : "failed";
        run.completedAt = now();
        return run;
      }

      if (role === "explore" && (result.findings?.length ?? 0) === 0) {
        const skippedPhase = {
          role: "implement" as const,
          status: "skipped" as const,
          summary: "No Explore findings; skipping Implement.",
          findings: [],
          changedFiles: [],
          tests: [],
          defects: [],
        };
        run.phases.push(skippedPhase);
        run.status = "blocked";
        run.completedAt = now();
        options.emit?.({ type: "agent:phase", runId: run.id, role: "explore", lifecycle: "result" });
        options.emit?.({ type: "agent:phase", runId: run.id, role: "implement", lifecycle: "skipped" });
        return run;
      }

      findings = result.findings ?? findings;
      changedFiles = result.changedFiles ?? changedFiles;
      tests = result.tests ?? tests;

      options.emit?.({ type: "agent:phase", runId: run.id, role, lifecycle: "result" });

      if (role === "review" && hasBlockingDefects(result.defects)) {
        run.status = "blocked";
        run.completedAt = now();
        return run;
      }
    } catch (error) {
      run.phases.push({
        role,
        status: "failed",
        summary: "Phase failed",
        error: error instanceof Error ? error.message : "Unknown phase failure",
      });
      run.status = "failed";
      run.updatedAt = now();
      run.completedAt = now();
      options.emit?.({ type: "agent:phase", runId: run.id, role, lifecycle: "failure" });
      return run;
    }
  }

  run.status = finalStatus(run.phases);
  run.completedAt = now();
  run.updatedAt = run.completedAt;
  return run;
}

export function serializePhaseSummary(result: PhaseResult): PhaseSummary {
  return {
    role: result.role,
    status: result.status,
    summary: result.summary,
    findings: result.findings ?? [],
    changedFiles: result.changedFiles ?? [],
    tests: result.tests ?? [],
    defects: result.defects ?? [],
  };
}

function hasBlockingDefects(defects: ReviewFinding[] | undefined): boolean {
  return defects?.some((defect) => defect.blocking) ?? false;
}

function finalStatus(phases: PhaseResult[]): OrchestrationStatus {
  return phases.some((phase) => phase.status === "failed") ? "failed" : "completed";
}
