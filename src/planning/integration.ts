import {
  detectPlanMode,
  hasPlanPrefix,
  stripPlanPrefix,
} from "./detector";
import { buildPlannerPrompt } from "./prompt";
import { parsePlanOutput } from "./parser";
import {
  transitionApproval,
  isApprovalFinal,
} from "./approval";
import {
  checkWriteBeforeApproval,
  checkFileCountExpansion,
} from "./scope-guard";
import type {
  ExecutionPlan,
  PlanApproval,
  PlanDecision,
  PlanEvent,
  PlanState,
} from "./types";
import { PlanApproval as PA, PlanDecision as PD } from "./types";

export interface PlanIntegrationOptions {
  onEvent?: (event: PlanEvent) => void;
  planModelCall?: (systemPrompt: string, userPrompt: string) => Promise<string>;
  maxScopeExpansion?: number;
}

export interface PlanResult {
  decision: PlanDecision;
  planText?: string;
  parsedPlan?: ExecutionPlan;
  approval: PlanApproval;
  isExecutable: boolean;
  errorMessage?: string;
}

export function createPlanIntegration(options: PlanIntegrationOptions = {}) {
  const emit = options.onEvent ?? (() => {});
  const planModelCall = options.planModelCall;
  const maxScopeExpansion = options.maxScopeExpansion ?? 3;

  function detect(userPrompt: string): PlanDecision {
    const decision = detectPlanMode({
      userPrompt,
      hasPlanPrefix: hasPlanPrefix(userPrompt),
    });
    emit({ type: "plan:decided", decision });
    return decision;
  }

  function extractTask(userPrompt: string): string {
    if (hasPlanPrefix(userPrompt)) {
      return stripPlanPrefix(userPrompt) || userPrompt;
    }
    return userPrompt;
  }

  async function generatePlan(task: string): Promise<{
    planText: string;
    parsedPlan?: ExecutionPlan;
    isExecutable: boolean;
  }> {
    const prompt = buildPlannerPrompt(task);

    let planText: string;
    if (planModelCall) {
      planText = await planModelCall(prompt.system, prompt.user);
    } else {
      // No model available — return a best-effort plan for testing
      planText = JSON.stringify({
        summary: task,
        steps: [{ order: 1, description: task }],
        affectedFiles: [],
        verification: [],
        risks: ["No model available for planning"],
      });
    }

    const parsed = parsePlanOutput(planText);
    if (parsed.plan) {
      emit({ type: "plan:generated", plan: parsed.plan });
    }

    return {
      planText,
      parsedPlan: parsed.plan,
      isExecutable: parsed.isExecutable,
    };
  }

  function approve(
    state: PlanState,
  ): { success: boolean; error?: string } {
    const result = transitionApproval(state.approval, PA.Approved);
    if (result.success && state.plan) {
      emit({ type: "plan:approved", plan: state.plan });
    }
    return result;
  }

  function reject(
    state: PlanState,
  ): { success: boolean; error?: string } {
    const result = transitionApproval(state.approval, PA.Rejected);
    if (result.success) {
      emit({ type: "plan:rejected" });
    }
    return result;
  }

  function checkWriteAllowed(
    approval: PlanApproval,
    plan: ExecutionPlan,
    touchedFiles: string[],
    newFile: string,
  ): { allowed: boolean; reason?: string } {
    const preApprovalCheck = checkWriteBeforeApproval(approval);
    if (!preApprovalCheck.allowed) return preApprovalCheck;

    const expansionCheck = checkFileCountExpansion(
      plan,
      touchedFiles,
      newFile,
      maxScopeExpansion,
    );
    if (!expansionCheck.allowed) {
      emit({
        type: "plan:scope_expanded",
        message: expansionCheck.reason ?? "Scope expanded",
      });
      return expansionCheck;
    }

    return { allowed: true };
  }

  function buildPlanState(
    decision: PlanDecision,
    userPrompt: string,
  ): PlanState {
    return {
      decision,
      request: {
        userPrompt,
        triggerReason:
          decision === PD.PlanRequested
            ? "manual"
            : decision === PD.PlanRequired
              ? "auto-complex"
              : "auto-risky",
        originalInput: userPrompt,
      },
      approval: PA.Pending,
      isExecutable: false,
    };
  }

  function toSessionMeta(state: PlanState): Record<string, unknown> {
    return {
      planDecision: state.decision,
      planApproval: state.approval,
      planSummary: state.plan?.summary ?? null,
      planIsExecutable: state.isExecutable,
    };
  }

  function fromSessionMeta(
    meta: Record<string, unknown>,
  ): Partial<PlanState> | null {
    if (meta.planDecision === undefined) return null;
    return {
      decision: meta.planDecision as PlanDecision,
      approval: (meta.planApproval as PlanApproval) ?? PA.Pending,
      isExecutable: (meta.planIsExecutable as boolean) ?? false,
    };
  }

  return {
    detect,
    extractTask,
    generatePlan,
    approve,
    reject,
    checkWriteAllowed,
    buildPlanState,
    toSessionMeta,
    fromSessionMeta,
    hasPlanPrefix,
    isApprovalFinal,
  };
}

export type PlanIntegration = ReturnType<typeof createPlanIntegration>;
