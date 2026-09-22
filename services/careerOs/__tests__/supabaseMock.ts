// A chainable stand-in for the PostgREST query builder (extends the pattern in
// services/repos/__tests__/accountLifecycle.test.ts): every filter method
// returns the builder, each terminal call consumes the next queued result, and
// every call is recorded per query so tests can assert the exact shape a repo
// sent (owner filter, revision precondition, conflict target, ...).

export type Call = [string, unknown[]];
export interface Query { table: string; calls: Call[] }
export interface Result { data?: unknown; error?: unknown; count?: number | null }

export const state = {
  queue: [] as Result[],
  fallback: { data: [], error: null } as Result,
  queries: [] as Query[],
  rpcs: [] as Array<{ name: string; args: unknown }>,
};

export function reset(): void {
  state.queue = [];
  state.fallback = { data: [], error: null };
  state.queries = [];
  state.rpcs = [];
}

/** Queue results in the order the repo will await them. */
export function enqueue(...results: Result[]): void {
  state.queue.push(...results);
}

const take = (): Result => (state.queue.length > 0 ? state.queue.shift()! : state.fallback);

const CHAINABLE = [
  'select', 'eq', 'neq', 'in', 'is', 'lte', 'gte', 'lt', 'gt', 'or', 'not', 'like', 'ilike', 'order', 'limit', 'range',
  'insert', 'update', 'upsert', 'delete', 'match',
];

function makeBuilder(query: Query): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => { query.calls.push([name, args]); return builder; };
  for (const m of CHAINABLE) builder[m] = chain(m);
  builder.maybeSingle = () => { query.calls.push(['maybeSingle', []]); return Promise.resolve(take()); };
  builder.single = () => { query.calls.push(['single', []]); return Promise.resolve(take()); };
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(take()).then(resolve, reject);
  return builder;
}

export function mockClient() {
  return {
    from: (table: string) => { const q: Query = { table, calls: [] }; state.queries.push(q); return makeBuilder(q); },
    rpc: (name: string, args: unknown) => {
      state.rpcs.push({ name, args });
      state.queries.push({ table: `rpc:${name}`, calls: [['rpc', [name, args]]] });
      return Promise.resolve(take());
    },
  };
}

/** Key-order-insensitive serialisation so `{a,b}` and `{b,a}` compare equal. */
export const stable = (v: unknown): string => JSON.stringify(v, (_k, val) =>
  (val && typeof val === 'object' && !Array.isArray(val))
    ? Object.keys(val as Record<string, unknown>).sort().reduce<Record<string, unknown>>((o, k) => { o[k] = (val as Record<string, unknown>)[k]; return o; }, {})
    : val);

export const has = (q: Query | undefined, name: string, ...args: unknown[]): boolean =>
  Boolean(q && q.calls.some(([n, a]) => n === name && stable(a) === stable(args)));

export const called = (q: Query | undefined, name: string): unknown[] | undefined => q?.calls.find(([n]) => n === name)?.[1];

export const query = (i: number): Query | undefined => state.queries[i];
export const lastQuery = (): Query | undefined => state.queries[state.queries.length - 1];
export const tables = (): string[] => state.queries.map((q) => q.table);
