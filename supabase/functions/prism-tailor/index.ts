import { handlePrismRequest } from './handler.ts';

// prism-tailor entry point. The whole pipeline (auth → flag gate → rate
// limits → metering → LangGraph phases streamed as NDJSON, plus the
// idempotent application binding and finalize reconciliation) lives in
// handler.ts with injectable dependencies so it can be exercised without the
// network; this file only serves it with the production deps.
Deno.serve((req) => handlePrismRequest(req));
