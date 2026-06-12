import { describe, expect, it } from "vitest";
import { State } from "../../src/runtime/types";

// Import will fail until implementation exists — this is the RED phase
import { transition } from "../../src/runtime/state-machine";

describe("State machine", () => {
  describe("valid transitions", () => {
    it("IDLE + user_input → THINKING", () => {
      expect(transition(State.IDLE, "user_input")).toBe(State.THINKING);
    });

    it("THINKING + text_complete → COMPLETED", () => {
      expect(transition(State.THINKING, "text_complete")).toBe(State.COMPLETED);
    });

    it("THINKING + tool_calls → TOOL_CALL", () => {
      expect(transition(State.THINKING, "tool_calls")).toBe(State.TOOL_CALL);
    });

    it("THINKING + error → ERROR", () => {
      expect(transition(State.THINKING, "error")).toBe(State.ERROR);
    });

    it("TOOL_CALL + all_done → THINKING (loop back)", () => {
      expect(transition(State.TOOL_CALL, "all_done")).toBe(State.THINKING);
    });

    it("TOOL_CALL + approval_needed → WAITING_APPROVAL", () => {
      expect(transition(State.TOOL_CALL, "approval_needed")).toBe(
        State.WAITING_APPROVAL,
      );
    });

    it("WAITING_APPROVAL + approved → TOOL_CALL", () => {
      expect(transition(State.WAITING_APPROVAL, "approved")).toBe(
        State.TOOL_CALL,
      );
    });

    it("WAITING_APPROVAL + denied → THINKING", () => {
      expect(transition(State.WAITING_APPROVAL, "denied")).toBe(
        State.THINKING,
      );
    });

    it("THINKING + interrupt → INTERRUPTED", () => {
      expect(transition(State.THINKING, "interrupt")).toBe(State.INTERRUPTED);
    });

    it("INTERRUPTED + resume → THINKING", () => {
      expect(transition(State.INTERRUPTED, "resume")).toBe(State.THINKING);
    });

    it("COMPLETED + next_turn → IDLE", () => {
      expect(transition(State.COMPLETED, "next_turn")).toBe(State.IDLE);
    });

    it("ERROR + recover → IDLE", () => {
      expect(transition(State.ERROR, "recover")).toBe(State.IDLE);
    });
  });

  describe("invalid transitions", () => {
    it("unknown event → ERROR", () => {
      expect(transition(State.IDLE, "unknown")).toBe(State.ERROR);
    });

    it("invalid transition IDLE + next_turn → ERROR", () => {
      expect(transition(State.IDLE, "next_turn")).toBe(State.ERROR);
    });

    it("STATE IDLE + all_done → ERROR", () => {
      expect(transition(State.IDLE, "all_done")).toBe(State.ERROR);
    });

    it("COMPLETED + user_input → ERROR", () => {
      expect(transition(State.COMPLETED, "user_input")).toBe(State.ERROR);
    });
  });

  describe("error recovery", () => {
    it("ERROR state allows recover → IDLE", () => {
      expect(transition(State.ERROR, "recover")).toBe(State.IDLE);
    });
  });
});
