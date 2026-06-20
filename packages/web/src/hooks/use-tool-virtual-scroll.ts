import { type VirtualScrollWindow, createVirtualScroll } from "./use-virtual-scroll";

export const TOOL_CARD_HEIGHT = 136;
const DEFAULT_ENABLE_THRESHOLD = 20;

export interface ToolVirtualScrollInput {
  toolCount: number;
  scrollTop: number;
  viewportHeight: number;
  enableThreshold?: number;
  overscan?: number;
}

export interface ToolVirtualScrollResult {
  enabled: boolean;
  window: VirtualScrollWindow | null;
}

export function useToolVirtualScroll(input: ToolVirtualScrollInput): ToolVirtualScrollResult {
  const threshold = input.enableThreshold ?? DEFAULT_ENABLE_THRESHOLD;
  const enabled = input.toolCount > threshold;

  if (!enabled) {
    return { enabled: false, window: null };
  }

  const window = createVirtualScroll({
    itemCount: input.toolCount,
    itemHeight: TOOL_CARD_HEIGHT,
    viewportHeight: input.viewportHeight,
    scrollTop: Math.max(0, input.scrollTop),
    overscan: input.overscan,
  });

  return { enabled: true, window };
}
