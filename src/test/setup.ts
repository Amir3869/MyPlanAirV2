import "@testing-library/jest-dom/vitest";

// Node 22's experimental built-in `localStorage` can shadow jsdom's working
// implementation and break without a `--localstorage-file`. Force a simple,
// always-functional in-memory polyfill for tests.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});

// jsdom does not implement scrollIntoView / scrollTo.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!window.scrollTo) {
  window.scrollTo = () => {};
}
