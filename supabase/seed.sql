-- Local development seed (never applied to hosted projects by `db push`).
-- Enables the Career OS cohort flag for every local user so the six-space
-- shell and gateway are exercised end to end; production rollout is an
-- operator action on feature_flags (enabled + rollout_pct).
update public.feature_flags set enabled = true, rollout_pct = 100 where flag in ('career_os', 'prism');
