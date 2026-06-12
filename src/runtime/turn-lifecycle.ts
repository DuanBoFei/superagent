import { TurnEvent } from "./types";

type Listener = (event: TurnEvent) => void;

interface Emitter {
  emit: (event: TurnEvent) => void;
  on: (type: string, handler: Listener) => void;
  off: (type: string, handler: Listener) => void;
}

export function createEmitter(): Emitter {
  const listeners = new Map<string, Set<Listener>>();

  function on(type: string, handler: Listener): void {
    let set = listeners.get(type);
    if (!set) {
      set = new Set();
      listeners.set(type, set);
    }
    set.add(handler);
  }

  function off(type: string, handler: Listener): void {
    listeners.get(type)?.delete(handler);
  }

  function emit(event: TurnEvent): void {
    const handlers = listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
    const wildcard = listeners.get("*");
    if (wildcard) {
      for (const handler of wildcard) {
        handler(event);
      }
    }
  }

  return { emit, on, off };
}
