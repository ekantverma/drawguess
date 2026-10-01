/** Keyed, cancellable timers. One instance per Room; clearAll() on room teardown. */
export class TimerService {
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();

  after(key: string, ms: number, cb: () => void): void {
    this.clear(key);
    const h = setTimeout(() => {
      this.timeouts.delete(key);
      cb();
    }, ms);
    h.unref?.();
    this.timeouts.set(key, h);
  }

  every(key: string, ms: number, cb: () => void): void {
    this.clear(key);
    const h = setInterval(cb, ms);
    h.unref?.();
    this.intervals.set(key, h);
  }

  clear(key: string): void {
    const t = this.timeouts.get(key);
    if (t) clearTimeout(t);
    this.timeouts.delete(key);
    const i = this.intervals.get(key);
    if (i) clearInterval(i);
    this.intervals.delete(key);
  }

  clearPrefix(prefix: string): void {
    for (const k of [...this.timeouts.keys(), ...this.intervals.keys()]) {
      if (k.startsWith(prefix)) this.clear(k);
    }
  }

  clearAll(): void {
    for (const k of [...this.timeouts.keys(), ...this.intervals.keys()]) this.clear(k);
  }

  get activeCount(): number {
    return this.timeouts.size + this.intervals.size;
  }
}
