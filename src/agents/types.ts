export type AgentRole = "explore" | "implement" | "review";

export type PhaseStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "interrupted";

export type OrchestrationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "interrupted";

export type ReviewFindingCategory =
  | "correctness"
  | "security"
  | "test"
  | "permission"
  | "maintainability";

export type ReviewFindingPriority = "low" | "medium" | "high";

export interface ReviewFinding {
  category: ReviewFindingCategory;
  description: string;
  priority: ReviewFindingPriority;
  file?: string;
  line?: number;
  blocking: boolean;
}

export interface PhaseResult {
  role: AgentRole;
  status: PhaseStatus;
  summary: string;
  findings?: string[];
  changedFiles?: string[];
  tests?: string[];
  defects?: ReviewFinding[];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface OrchestrationRun {
  id: string;
  prompt: string;
  status: OrchestrationStatus;
  phases: PhaseResult[];
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type RoutingMode = "single" | "multi";

export interface RoutingDecision {
  mode: RoutingMode;
  prompt: string;
  reason: "simple" | "forced" | "complex";
}

export interface PhaseInput {
  prompt: string;
  role: AgentRole;
  findings?: string[];
  changedFiles?: string[];
  tests?: string[];
}

export type PhaseLifecycleEvent = "start" | "result" | "failure" | "skipped";

export interface PhaseSummary {
  role: AgentRole;
  status: PhaseStatus;
  summary: string;
  findings: string[];
  changedFiles: string[];
  tests: string[];
  defects: ReviewFinding[];
}
