import { describe, expect, it, vi } from "vitest";
import { createSocketController } from "../../packages/web/src/hooks/use-socket";

describe("socket controller", () => {
  it("uses exponential reconnect delays and stops after ten attempts", () => {
    const delays: number[] = [];
    const store = { setConnected: vi.fn() };
    const controller = createSocketController({
      connectSocket: () => ({ close: vi.fn() }),
      schedule: (delay, callback) => {
        delays.push(delay);
        if (delays.length < 10) callback();
        return 1;
      },
      clearSchedule: vi.fn(),
      store,
    });

    controller.connect();
    controller.handleDisconnect();

    expect(delays).toEqual([1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000, 8000, 8000]);
    expect(store.setConnected).toHaveBeenLastCalledWith(false);
  });
});
