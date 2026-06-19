export interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
}

export interface VirtualScrollItem {
  index: number;
  offsetTop: number;
  height: number;
}

export interface VirtualScrollWindow {
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  topPadding: number;
  bottomPadding: number;
  items: VirtualScrollItem[];
}

export function createVirtualScroll(options: VirtualScrollOptions): VirtualScrollWindow {
  const overscan = options.overscan ?? 2;
  const totalHeight = options.itemCount * options.itemHeight;
  const visibleStart = Math.floor(options.scrollTop / options.itemHeight);
  const visibleCount = Math.ceil(options.viewportHeight / options.itemHeight);
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(options.itemCount, visibleStart + visibleCount + overscan);
  const items: VirtualScrollItem[] = [];

  for (let index = startIndex; index < endIndex; index++) {
    items.push({
      index,
      offsetTop: index * options.itemHeight,
      height: options.itemHeight,
    });
  }

  return {
    startIndex,
    endIndex,
    totalHeight,
    topPadding: startIndex * options.itemHeight,
    bottomPadding: totalHeight - endIndex * options.itemHeight,
    items,
  };
}

export function useVirtualScroll(options: VirtualScrollOptions): VirtualScrollWindow {
  return createVirtualScroll(options);
}
