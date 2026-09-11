import 'fake-indexeddb/auto';

// Ensure localStorage is present in node environment
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.getItem) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(String(key)) ?? null,
    setItem: (key, val) => store.set(String(key), String(val)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i] ?? null
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}

// Shim Web Worker for headless node test environment
if (typeof globalThis.Worker === 'undefined') {
  globalThis.Worker = class MockWorker {
    constructor() {
      this.onmessage = null;
    }
    postMessage(data) {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  };
}
