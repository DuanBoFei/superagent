export interface SocketLike {
  close(): void;
}

export interface SocketStore {
  setConnected(isConnected: boolean): void;
}

export interface SocketControllerOptions {
  connectSocket: () => SocketLike;
  schedule: (delayMs: number, callback: () => void) => unknown;
  clearSchedule: (handle: unknown) => void;
  store: SocketStore;
}

export interface SocketController {
  connect(): void;
  disconnect(): void;
  handleDisconnect(): void;
}

export function createSocketController(options: SocketControllerOptions): SocketController {
  let socket: SocketLike | undefined;
  let reconnectHandle: unknown;
  let attempts = 0;

  const clearReconnect = () => {
    if (reconnectHandle !== undefined) {
      options.clearSchedule(reconnectHandle);
      reconnectHandle = undefined;
    }
  };

  const connect = () => {
    clearReconnect();
    socket = options.connectSocket();
    attempts = 0;
    options.store.setConnected(true);
  };

  const scheduleReconnect = () => {
    if (attempts >= 10) {
      return;
    }
    const delay = Math.min(1000 * 2 ** attempts, 8000);
    attempts += 1;
    reconnectHandle = options.schedule(delay, scheduleReconnect);
  };

  return {
    connect,
    disconnect: () => {
      clearReconnect();
      socket?.close();
      socket = undefined;
      options.store.setConnected(false);
    },
    handleDisconnect: () => {
      socket = undefined;
      options.store.setConnected(false);
      scheduleReconnect();
    },
  };
}

export function useSocket(options: SocketControllerOptions): SocketController {
  return createSocketController(options);
}
