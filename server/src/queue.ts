/**
 * Queue abstraction.
 *
 * Default impl: in-process async dispatch (fire-and-forget Promise).
 * Seam: swap `enqueue` for a BullMQ producer; the worker side would
 * register the same handler key with `Worker(queueName, async job => handlers[job.name](job.data))`.
 *
 * Handlers are looked up by name so adding a real broker doesn't require
 * touching call sites — only this file and a tiny worker bootstrap.
 */

type Handler<T> = (payload: T) => Promise<void>;

const handlers = new Map<string, Handler<unknown>>();

export function registerHandler<T>(name: string, fn: Handler<T>): void {
  handlers.set(name, fn as Handler<unknown>);
}

export function enqueue<T>(name: string, payload: T): void {
  const fn = handlers.get(name);
  if (!fn) {
    // Surfaces a programming error early; never silently drop work.
    throw new Error(`No handler registered for queue task "${name}"`);
  }
  // In-process: schedule on next tick so the HTTP response can flush first.
  setImmediate(() => {
    fn(payload).catch((err) => {
      // Last-resort log — a real queue would retry with backoff here.
      console.error(`[queue:${name}] handler failed`, err);
    });
  });
}
