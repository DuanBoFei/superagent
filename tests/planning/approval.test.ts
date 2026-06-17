import { describe, expect, it } from "vitest";
import {
  transitionApproval,
  isApprovalFinal,
  createInitialPlanState,
} from "../../src/planning/approval";
import { PlanApproval } from "../../src/planning/types";

describe("transitionApproval", () => {
  it("pending → approved is allowed", () => {
    const result = transitionApproval(
      PlanApproval.Pending,
      PlanApproval.Approved,
    );
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PlanApproval.Approved);
  });

  it("pending → rejected is allowed", () => {
    const result = transitionApproval(
      PlanApproval.Pending,
      PlanApproval.Rejected,
    );
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PlanApproval.Rejected);
  });

  it("approved → pending is not allowed", () => {
    const result = transitionApproval(
      PlanApproval.Approved,
      PlanApproval.Pending,
    );
    expect(result.success).toBe(false);
  });

  it("approved → rejected is not allowed", () => {
    const result = transitionApproval(
      PlanApproval.Approved,
      PlanApproval.Rejected,
    );
    expect(result.success).toBe(false);
  });

  it("rejected → pending is not allowed", () => {
    const result = transitionApproval(
      PlanApproval.Rejected,
      PlanApproval.Pending,
    );
    expect(result.success).toBe(false);
  });

  it("rejected → approved is not allowed", () => {
    const result = transitionApproval(
      PlanApproval.Rejected,
      PlanApproval.Approved,
    );
    expect(result.success).toBe(false);
  });

  it("same-state transitions are invalid", () => {
    const result = transitionApproval(
      PlanApproval.Pending,
      PlanApproval.Pending,
    );
    expect(result.success).toBe(false);
  });

  it("error message describes the invalid transition", () => {
    const result = transitionApproval(
      PlanApproval.Approved,
      PlanApproval.Rejected,
    );
    expect(result.error).toContain("not allowed");
    expect(result.error).toContain("approved");
    expect(result.error).toContain("rejected");
  });
});

describe("isApprovalFinal", () => {
  it("approved is final", () => {
    expect(isApprovalFinal(PlanApproval.Approved)).toBe(true);
  });

  it("rejected is final", () => {
    expect(isApprovalFinal(PlanApproval.Rejected)).toBe(true);
  });

  it("pending is not final", () => {
    expect(isApprovalFinal(PlanApproval.Pending)).toBe(false);
  });
});

describe("createInitialPlanState", () => {
  it("starts in pending state", () => {
    const state = createInitialPlanState();
    expect(state.approval).toBe(PlanApproval.Pending);
  });

  it("sets decision to plan-requested", () => {
    const state = createInitialPlanState();
    expect(state.decision).toBe("plan-requested");
  });
});
