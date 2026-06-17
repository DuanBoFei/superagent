import type { PlanApproval, PlanState } from "./types";
import { PlanApproval as PA } from "./types";

export interface ApprovalTransition {
  from: PlanApproval;
  to: PlanApproval;
  allowed: boolean;
}

const TRANSITIONS: ApprovalTransition[] = [
  { from: PA.Pending, to: PA.Approved, allowed: true },
  { from: PA.Pending, to: PA.Rejected, allowed: true },
  { from: PA.Approved, to: PA.Pending, allowed: false },
  { from: PA.Approved, to: PA.Rejected, allowed: false },
  { from: PA.Rejected, to: PA.Pending, allowed: false },
  { from: PA.Rejected, to: PA.Approved, allowed: false },
];

export function transitionApproval(
  current: PlanApproval,
  target: PlanApproval,
): { success: boolean; newState?: PlanApproval; error?: string } {
  const transition = TRANSITIONS.find(
    (t) => t.from === current && t.to === target,
  );

  if (!transition) {
    return {
      success: false,
      error: `Invalid transition: ${current} → ${target}`,
    };
  }

  if (!transition.allowed) {
    return {
      success: false,
      error: `Transition not allowed: ${current} → ${target}`,
    };
  }

  return { success: true, newState: target };
}

export function isApprovalFinal(state: PlanApproval): boolean {
  return state === PA.Approved || state === PA.Rejected;
}

export function createInitialPlanState(): Pick<
  PlanState,
  "approval" | "decision"
> {
  return {
    approval: PA.Pending,
    decision: "plan-requested" as const,
  };
}
