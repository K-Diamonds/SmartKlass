import { AsyncLocalStorage } from 'async_hooks';

type CorrelationStore = {
  correlationId: string;
  requestId?: string;
};

const storage = new AsyncLocalStorage<CorrelationStore>();

export function runWithCorrelation<T>(
  store: CorrelationStore,
  fn: () => T,
): T {
  return storage.run(store, fn);
}

export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
