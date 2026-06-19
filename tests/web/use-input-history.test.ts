import { describe, expect, it } from "vitest";
import { createInputHistory } from "../../packages/web/src/hooks/use-input-history";

describe("input history", () => {
  it("navigates up and down through recent input", () => {
    const history = createInputHistory();

    history.addHistoryItem("one");
    history.addHistoryItem("two");
    history.addHistoryItem("three");

    expect(history.navigateUp()).toBe("three");
    expect(history.navigateUp()).toBe("two");
    expect(history.navigateUp()).toBe("one");
    expect(history.navigateUp()).toBe("one");
    expect(history.navigateDown()).toBe("two");
    expect(history.navigateDown()).toBe("three");
    expect(history.navigateDown()).toBe("");
  });

  it("keeps only the latest fifty entries", () => {
    const history = createInputHistory();

    for (let index = 0; index < 51; index++) {
      history.addHistoryItem(`item-${index}`);
    }

    expect(history.getItems()).toHaveLength(50);
    expect(history.getItems()[0]).toBe("item-1");
  });
});
