import { z } from "zod/v4";

// --- Plan Decision ---

export const PlanDecision = {
  Direct: "direct" as const,
  PlanRequired: "plan-required" as const,
  PlanRequested: "plan-requested" as const,
} as const;

export type PlanDecision = (typeof PlanDecision)[keyof typeof PlanDecision];

// --- Plan Approval ---

export const PlanApproval = {
  Pending: "pending" as const,
  Approved: "approved" as const,
  Rejected: "rejected" as const,
} as const;

export type PlanApproval = (typeof PlanApproval)[keyof typeof PlanApproval];

// --- Plan Mode Request ---

export interface PlanModeRequest {
  userPrompt: string;
  triggerReason: "manual" | "auto-complex" | "auto-risky";
  originalInput: string;
}

// --- Execution Plan ---

export const planStepSchema = z.object({
  order: z.number().int().min(1),
  description: z.string().min(1),
  file: z.string().optional(),
  verification: z.string().optional(),
});

export const executionPlanSchema = z.object({
  summary: z.string().min(1),
  steps: z.array(planStepSchema).min(1),
  affectedFiles: z.array(z.string()),
  verification: z.array(z.string()),
  risks: z.array(z.string()),
  assumptions: z.array(z.string()).optional(),
});

export type PlanStep = z.infer<typeof planStepSchema>;
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;

// --- Plan State ---

export interface PlanState {
  decision: PlanDecision;
  request: PlanModeRequest;
  plan?: ExecutionPlan;
  approval: PlanApproval;
  planRawText?: string;
  isExecutable: boolean;
}

// --- Detector Input ---

export interface DetectorInput {
  userPrompt: string;
  hasPlanPrefix: boolean;
  skillSuggestedPlan?: boolean;
}

// --- Planner Prompt ---

export interface PlannerPrompt {
  system: string;
  user: string;
}

// --- Plan Events (observability) ---

export type PlanEvent =
  | { type: "plan:decided"; decision: PlanDecision }
  | { type: "plan:generated"; plan: ExecutionPlan }
  | { type: "plan:approved"; plan: ExecutionPlan }
  | { type: "plan:rejected"; reason?: string }
  | { type: "plan:executed"; plan: ExecutionPlan }
  | { type: "plan:scope_expanded"; message: string };
