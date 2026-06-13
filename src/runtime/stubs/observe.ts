import { LogEvent } from "../../observability/types";

export function emit(event: LogEvent): void {
  // Stub — replaced by T11 when wired to full observability
  console.debug("[STUB] observe.emit:", event.type);
}
