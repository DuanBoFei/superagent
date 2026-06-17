import type { ExecutionPlan, PlanApproval } from "./types";

export interface ScopeCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkWriteBeforeApproval(
  approval: PlanApproval,
): ScopeCheckResult {
  if (approval !== "approved") {
    return {
      allowed: false,
      reason: "Write operations require an approved plan",
    };
  }
  return { allowed: true };
}

export function checkFileCountExpansion(
  plan: ExecutionPlan,
  currentFiles: string[],
  newFile: string,
  maxAllowed: number,
): ScopeCheckResult {
  const inPlan = plan.affectedFiles.some(
    (f) => normalizePath(f) === normalizePath(newFile),
  );

  const uniqueNewFiles = currentFiles.filter(
    (f) =>
      !plan.affectedFiles.some((pf) => normalizePath(pf) === normalizePath(f)),
  );

  if (!inPlan) {
    uniqueNewFiles.push(newFile);
  }

  const expandedCount = uniqueNewFiles.length;

  if (expandedCount > maxAllowed) {
    return {
      allowed: false,
      reason: `Scope expanded beyond ${maxAllowed} unplanned file(s): ${uniqueNewFiles.slice(0, 3).join(", ")}${uniqueNewFiles.length > 3 ? "..." : ""}. Consider re-planning.`,
    };
  }

  return { allowed: true };
}

export function isFileInScope(
  plan: ExecutionPlan,
  filePath: string,
): boolean {
  return plan.affectedFiles.some(
    (f) => normalizePath(f) === normalizePath(filePath),
  );
}

export function getExpandedFiles(
  plan: ExecutionPlan,
  touchedFiles: string[],
): string[] {
  return touchedFiles.filter(
    (f) =>
      !plan.affectedFiles.some((pf) => normalizePath(pf) === normalizePath(f)),
  );
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}
