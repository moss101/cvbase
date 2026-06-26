-- W7 hardening: atomic check-and-increment for metered usage.
--
-- The Edge Function entitlement guard previously did read -> compare -> upsert,
-- which races: two concurrent AI calls could both read `used`, both pass the
-- limit check, and both write used+1 (last-write-wins), letting a user exceed
-- their monthly cap. This function does the whole thing in one transaction with
-- a row lock (SELECT ... FOR UPDATE), so concurrent callers serialize.
--
-- Returns TRUE and increments when within limit; returns FALSE without
-- incrementing when already at/over the limit. p_limit < 0 means unlimited.
-- SECURITY DEFINER so the service_role caller writes usage_counters (which is
-- otherwise service-only); inputs are fully parameterized (no dynamic SQL).
create or replace function public.consume_usage(
  p_user uuid,
  p_month text,
  p_kind text,
  p_limit int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur int;
begin
  insert into public.usage_counters (user_id, month) values (p_user, p_month)
    on conflict (user_id, month) do nothing;

  if p_kind = 'atsScans' then
    select ats_scans into cur from public.usage_counters
      where user_id = p_user and month = p_month for update;
    if p_limit >= 0 and cur >= p_limit then return false; end if;
    update public.usage_counters set ats_scans = ats_scans + 1
      where user_id = p_user and month = p_month;
  elsif p_kind = 'aiActions' then
    select ai_actions into cur from public.usage_counters
      where user_id = p_user and month = p_month for update;
    if p_limit >= 0 and cur >= p_limit then return false; end if;
    update public.usage_counters set ai_actions = ai_actions + 1
      where user_id = p_user and month = p_month;
  else
    raise exception 'consume_usage: unknown kind %', p_kind;
  end if;

  return true;
end;
$$;

-- Only the service_role (Edge Functions) may meter; never the client.
revoke all on function public.consume_usage(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.consume_usage(uuid, text, text, int) to service_role;
