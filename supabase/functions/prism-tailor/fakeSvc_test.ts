// In-memory stand-in for the service-role Supabase client, just enough of the
// PostgREST builder surface for handler.ts: from(table).select/insert/update
// with eq/gte/in/order/limit filters and maybeSingle/single/thenable
// terminals. Failures are injectable per (table, op) so tests can script a
// checkpoint write that rejects or a link update that errors. Shared by the
// handler tests; the `_test` suffix keeps it out of the deployed bundle.

export type Row = Record<string, unknown>;
type Op = 'select' | 'insert' | 'update' | 'delete';
export interface Failure {
  table: string;
  op: Op;
  /** How many consecutive calls fail (default: forever). */
  times?: number;
  /** Reject the promise instead of resolving `{ error }`. */
  reject?: boolean;
  /** Only fail calls whose insert/update payload matches (e.g. checkpoint writes). */
  when?: (payload: Row) => boolean;
  error?: { code?: string; message: string };
}

const UNIQUE: Record<string, string[]> = {
  prism_runs: ['user_id', 'idempotency_key'],
};

export class FakeSvc {
  tables: Record<string, Row[]> = {};
  failures: Failure[] = [];
  /** Every executed op as `op:table` — lets tests assert write ordering. */
  ops: string[] = [];
  clock: () => number;

  constructor(seed: Record<string, Row[]> = {}, clock: () => number = () => Date.now()) {
    for (const [t, rows] of Object.entries(seed)) this.tables[t] = rows.map((r) => ({ ...r }));
    this.clock = clock;
  }

  rows(table: string): Row[] {
    return this.tables[table] ??= [];
  }

  failNext(f: Failure): void {
    this.failures.push({ times: Infinity, ...f });
  }

  from(table: string): Query {
    return new Query(this, table);
  }

  /** Consumes one scripted failure for (table, op[, payload]) if any is armed. */
  takeFailure(table: string, op: Op, payload: Row): Failure | null {
    const f = this.failures.find((x) =>
      x.table === table && x.op === op && (x.times ?? Infinity) > 0 && (!x.when || x.when(payload)));
    if (!f) return null;
    f.times = (f.times ?? Infinity) - 1;
    return f;
  }
}

type Filter = (row: Row) => boolean;

class Query {
  private op: Op = 'select';
  private filters: Filter[] = [];
  private payload: Row = {};
  private countMode = false;
  private headMode = false;
  private limitN: number | null = null;
  private returning = false;

  constructor(private db: FakeSvc, private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }): this {
    if (this.op === 'insert' || this.op === 'update') {
      this.returning = true;
      return this;
    }
    this.op = 'select';
    this.countMode = !!opts?.count;
    this.headMode = !!opts?.head;
    return this;
  }
  insert(row: Row): this { this.op = 'insert'; this.payload = row; return this; }
  update(patch: Row): this { this.op = 'update'; this.payload = patch; return this; }
  delete(): this { this.op = 'delete'; return this; }
  eq(k: string, v: unknown): this { this.filters.push((r) => String(r[k]) === String(v)); return this; }
  gte(k: string, v: unknown): this { this.filters.push((r) => String(r[k] ?? '') >= String(v)); return this; }
  in(k: string, vs: unknown[]): this { this.filters.push((r) => vs.map(String).includes(String(r[k]))); return this; }
  order(): this { return this; }
  limit(n: number): this { this.limitN = n; return this; }

  maybeSingle(): Promise<{ data: Row | null; error: unknown }> {
    return this.exec().then(({ data, error }) => ({ data: (data as Row[] | null)?.[0] ?? null, error }));
  }
  single(): Promise<{ data: Row | null; error: unknown }> {
    return this.exec().then(({ data, error }) => {
      const row = (data as Row[] | null)?.[0] ?? null;
      return { data: row, error: error ?? (row ? null : { code: 'PGRST116', message: 'no rows' }) };
    });
  }
  then<T>(res: (v: { data: unknown; error: unknown; count?: number | null }) => T, rej?: (e: unknown) => T): Promise<T> {
    return this.exec().then(res, rej);
  }

  private exec(): Promise<{ data: unknown; error: unknown; count?: number | null }> {
    this.db.ops.push(`${this.op}:${this.table}`);
    const failure = this.db.takeFailure(this.table, this.op, this.payload);
    if (failure) {
      const error = failure.error ?? { code: 'XX000', message: `scripted ${this.op} failure on ${this.table}` };
      return failure.reject ? Promise.reject(new Error(error.message)) : Promise.resolve({ data: null, error });
    }
    const rows = this.db.rows(this.table);
    const matches = rows.filter((r) => this.filters.every((f) => f(r)));
    const now = new Date(this.db.clock()).toISOString();
    switch (this.op) {
      case 'select': {
        const out = this.limitN === null ? matches : matches.slice(0, this.limitN);
        return Promise.resolve({
          data: this.headMode ? null : out.map((r) => ({ ...r })),
          error: null,
          count: this.countMode ? matches.length : null,
        });
      }
      case 'insert': {
        const row: Row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...this.payload };
        const uniq = UNIQUE[this.table];
        if (uniq && uniq.every((k) => row[k] !== null && row[k] !== undefined)) {
          const dup = rows.some((r) => uniq.every((k) => String(r[k]) === String(row[k])));
          if (dup) return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } });
        }
        rows.push(row);
        return Promise.resolve({ data: this.returning ? [{ ...row }] : null, error: null });
      }
      case 'update': {
        for (const r of matches) {
          Object.assign(r, this.payload, { updated_at: now });
          if (typeof r.revision === 'number') r.revision += 1;
        }
        return Promise.resolve({ data: this.returning ? matches.map((r) => ({ ...r })) : null, error: null });
      }
      case 'delete': {
        this.db.tables[this.table] = rows.filter((r) => !matches.includes(r));
        return Promise.resolve({ data: null, error: null });
      }
    }
  }
}
