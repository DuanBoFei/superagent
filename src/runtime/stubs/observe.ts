import { TurnEvent } from "../types";

export function emit(event: TurnEvent): void {
  console.debug("[STUB] emit:", JSON.stringify(event));
}
