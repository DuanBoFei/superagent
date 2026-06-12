import { describe, expect, it } from "vitest";
import { State } from "../../src/runtime/types";

describe("Runtime types", () => {
  it("State enum has all 8 states", () => {
    expect(Object.keys(State).length).toBe(8);
    expect(State.IDLE).toBe("IDLE");
    expect(State.THINKING).toBe("THINKING");
    expect(State.TOOL_CALL).toBe("TOOL_CALL");
    expect(State.WAITING_APPROVAL).toBe("WAITING_APPROVAL");
    expect(State.COMPACTING).toBe("COMPACTING");
    expect(State.INTERRUPTED).toBe("INTERRUPTED");
    expect(State.ERROR).toBe("ERROR");
    expect(State.COMPLETED).toBe("COMPLETED");
  });
});
