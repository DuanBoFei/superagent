import { State } from "./types";

const transitions = new Map<State, Map<string, State>>([
  [
    State.IDLE,
    new Map([["user_input", State.THINKING]]),
  ],
  [
    State.THINKING,
    new Map([
      ["text_complete", State.COMPLETED],
      ["tool_calls", State.TOOL_CALL],
      ["error", State.ERROR],
      ["interrupt", State.INTERRUPTED],
    ]),
  ],
  [
    State.TOOL_CALL,
    new Map([
      ["all_done", State.THINKING],
      ["approval_needed", State.WAITING_APPROVAL],
    ]),
  ],
  [
    State.WAITING_APPROVAL,
    new Map([
      ["approved", State.TOOL_CALL],
      ["denied", State.THINKING],
    ]),
  ],
  [State.INTERRUPTED, new Map([["resume", State.THINKING]])],
  [State.COMPLETED, new Map([["next_turn", State.IDLE]])],
  [State.ERROR, new Map([["recover", State.IDLE]])],
  [State.COMPACTING, new Map<string, State>()],
]);

export function transition(current: State, event: string): State {
  const stateTransitions = transitions.get(current);
  if (!stateTransitions) {
    return State.ERROR;
  }
  const next = stateTransitions.get(event);
  if (next === undefined) {
    return State.ERROR;
  }
  return next;
}
