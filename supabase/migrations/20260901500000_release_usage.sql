-- Quota refund for failed AI calls.
--
-- Metering happens BEFORE the model call (consume_usage, so concurrent calls
-- can't race past the cap). When the call then fails on our side — every LLM
-- provider down (llm_unavailable), a 5xx from the model, malformed model
-- output — the user got nothing, so the Edge handler (_shared/handler.ts)
-- gives the action back with this function. Decrements the CURRENT UTC month's
-- counter by 1, never below 0, and is a no-op when no row exists.
--
-- The month key mirrors entitlement.ts monthKey(): UTC 'YYYY-MM'.
create or replace function public.release_usage(
  p_user_id uuid,
  p_kind text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month text := to_char(timezone('utc', now()), 'YYYY-MM');
  v_new int := 0;
begin
  if p_kind = 'atsScans' then
    update public.usage_counters
      set ats_scans = greatest(ats_scans - 1, 0)
      where user_id = p_user_id and month = v_month
      returning ats_scans into v_new;
  elsif p_kind = 'aiActions' then
    update public.usage_counters
      set ai_actions = greatest(ai_actions - 1, 0)
      where user_id = p_user_id and month = v_month
      returning ai_actions into v_new;
  else
    raise exception 'release_usage: unknown kind %', p_kind;
  end if;
  return coalesce(v_new, 0);
end;
$$;

-- Only the service_role (Edge Functions) may refund; never the client.
revoke all on function public.release_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.release_usage(uuid, text) to service_role;
