type CoverJob = (signal: AbortSignal) => Promise<Blob | null>;
type Entry = { controller: AbortController; promise: Promise<Blob | null>; refs: number; settled: boolean; bytes: number };

/** Share work while visible; retain only a bounded set of finished, small covers. */
export class TaskFileThumbnailCache {
  private entries = new Map<string, Entry>();
  private queue: Array<() => void> = [];
  private running = 0;
  constructor(private maxEntries = 36, private maxBytes = 24 * 1024 * 1024, private concurrency = 2) {}

  invalidate(key: string): void { if (this.entries.get(key)?.settled) this.entries.delete(key); }

  acquire(key: string, load: CoverJob): { promise: Promise<Blob | null>; release: () => void } {
    let entry = this.entries.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { controller, promise: Promise.resolve(null), refs: 0, settled: false, bytes: 0 };
      const current = entry;
      entry.promise = new Promise<Blob | null>((resolve, reject) => {
        this.queue.push(() => {
          this.running++;
          Promise.resolve().then(() => {
            if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
            return load(controller.signal);
          }).then(resolve, reject).finally(() => { this.running--; this.drain(); });
        });
      }).then(value => { current.settled = true; current.bytes = value?.size ?? 0; this.trim(); return value; }, error => {
        current.settled = true;
        if (this.entries.get(key) === current) this.entries.delete(key);
        throw error;
      });
      this.entries.set(key, entry);
    } else {
      this.entries.delete(key);
      this.entries.set(key, entry);
    }
    entry.refs++;
    this.drain();
    let released = false;
    return { promise: entry.promise, release: () => {
      if (released) return;
      released = true;
      entry.refs--;
      if (!entry.refs && !entry.settled) {
        entry.controller.abort();
        if (this.entries.get(key) === entry) this.entries.delete(key);
      }
      this.trim();
    } };
  }

  private drain() { while (this.running < this.concurrency && this.queue.length) this.queue.shift()!(); }
  private trim() {
    let bytes = [...this.entries.values()].reduce((sum, entry) => sum + entry.bytes, 0);
    for (const [key, entry] of this.entries) {
      if (this.entries.size <= this.maxEntries && bytes <= this.maxBytes) break;
      if (entry.refs || !entry.settled) continue;
      this.entries.delete(key);
      bytes -= entry.bytes;
    }
  }
}

export const taskFileThumbnailCache = new TaskFileThumbnailCache();
