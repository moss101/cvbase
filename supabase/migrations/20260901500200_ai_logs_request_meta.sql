-- ai_logs: per-request correlation + latency (additive, nullable).
--
-- _shared/handler.ts stamps every AI call with a request id (echoed to the
-- client as `x-request-id`) and its wall-clock duration. Storing them here
-- lets an ops query join a client-side error report to the exact ai_logs row
-- and spot slow calls without grepping function logs. Both columns are
-- nullable so old rows and any caller that does not set them stay valid.
alter table public.ai_logs
  add column if not exists request_id uuid,
  add column if not exists latency_ms int;

create index if not exists ai_logs_request_id_idx on public.ai_logs (request_id)
  where request_id is not null;
