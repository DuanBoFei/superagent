import type { Message } from "../../types/message";
import { createVirtualScroll } from "../../hooks/use-virtual-scroll";
import { renderMessageBubble } from "./message-bubble";

export interface MessageListRenderOptions {
  messages: Message[];
  viewportHeight: number;
  scrollTop: number;
  itemHeight?: number;
}

export interface MessageListControllerOptions {
  viewportHeight: number;
  bottomThreshold?: number;
}

export interface MessageListController {
  setContentHeight(height: number): void;
  setScrollTop(scrollTop: number): void;
  shouldAutoScroll(): boolean;
  shouldShowJumpToLatest(): boolean;
}

export function renderMessageList(options: MessageListRenderOptions): string {
  const itemHeight = options.itemHeight ?? 72;
  const window = createVirtualScroll({
    itemCount: options.messages.length,
    itemHeight,
    viewportHeight: options.viewportHeight,
    scrollTop: options.scrollTop,
    overscan: 2,
  });
  const body = window.items.map((item) => renderMessageBubble(options.messages[item.index])).join("\n");

  return `<section class="message-list h-full overflow-y-auto bg-neutral-950 px-3 py-2" data-total="${options.messages.length}" data-rendered="${window.items.length}">
  <div style="height:${window.topPadding}px"></div>
  ${body}
  <div style="height:${window.bottomPadding}px"></div>
</section>`;
}

export function createMessageListController(options: MessageListControllerOptions): MessageListController {
  let contentHeight = 0;
  let scrollTop = 0;
  const threshold = options.bottomThreshold ?? 32;

  const isAtBottom = () => contentHeight - (scrollTop + options.viewportHeight) <= threshold;

  return {
    setContentHeight: (height) => {
      contentHeight = height;
    },
    setScrollTop: (nextScrollTop) => {
      scrollTop = nextScrollTop;
    },
    shouldAutoScroll: isAtBottom,
    shouldShowJumpToLatest: () => !isAtBottom(),
  };
}
