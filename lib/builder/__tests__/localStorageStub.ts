/**
 * In-memory `localStorage` for tests. Node 22+ defines its own experimental
 * `globalThis.localStorage` accessor (undefined without --localstorage-file),
 * which shadows jsdom's implementation under vitest, so tests that exercise
 * the draft cache / pending queues install this stub explicitly.
 */
export function installLocalStorage(): Storage {
    const store = new Map<string, string>();
    const stub: Storage = {
        get length() { return store.size; },
        clear: () => { store.clear(); },
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => { store.delete(key); },
        setItem: (key: string, value: string) => { store.set(key, String(value)); },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
    return stub;
}
