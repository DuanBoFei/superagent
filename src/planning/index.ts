export {
  PlanDecision,
  PlanApproval,
  type PlanModeRequest,
  type ExecutionPlan,
  type PlanStep,
  type PlanState,
  type DetectorInput,
  type PlannerPrompt,
  type PlanEvent,
  executionPlanSchema,
  planStepSchema,
} from "./types";

export { detectPlanMode, hasPlanPrefix, stripPlanPrefix } from "./detector";
export { buildPlannerPrompt } from "./prompt";
export { parsePlanOutput, type ParseResult } from "./parser";
export {
  transitionApproval,
  isApprovalFinal,
  createInitialPlanState,
  type ApprovalTransition,
} from "./approval";
export {
  checkWriteBeforeApproval,
  checkFileCountExpansion,
  isFileInScope,
  getExpandedFiles,
  type ScopeCheckResult,
} from "./scope-guard";

export {
  createPlanIntegration,
  type PlanIntegration,
  type PlanIntegrationOptions,
  type PlanResult,
} from "./integration";
