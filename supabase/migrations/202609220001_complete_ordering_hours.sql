begin;

-- Complete the original repository schema. Thursday-Saturday use weekend
-- closing times, matching the deployed schedules. Preserve existing settings.
insert into public.branch_ordering_hours (branch_code, day_of_week, opens, closes)
select 'NAB', day, 660, case when day in (4,5,6) then 1500 else 1440 end
from generate_series(0,6) day
on conflict (branch_code, day_of_week) do nothing;

insert into public.branch_ordering_hours (branch_code, day_of_week, opens, closes)
select 'ICON', day, 600, case when day in (4,5,6) then 1440 else 1380 end
from generate_series(0,6) day
on conflict (branch_code, day_of_week) do nothing;

commit;
