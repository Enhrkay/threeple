CREATE OR REPLACE FUNCTION public.generate_recurring_schedule (
  p_collection_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_setting public.recurring_settings%rowtype;
  v_cycle integer;
  v_start date;
  v_due date;
  v_end date;
  v_cycle_id uuid;
  v_created integer := 0;
begin
  select *
  into v_setting
  from public.recurring_settings
  where collection_id = p_collection_id;

  if not found then
    raise exception 'Recurring settings not found for collection %', p_collection_id;
  end if;

  if exists (
    select 1
    from public.recurring_cycles
    where collection_id = p_collection_id
  ) then
    raise exception 'Recurring schedule already exists for collection %', p_collection_id;
  end if;

  for v_cycle in 1..v_setting.cycles_to_generate loop
    if v_setting.frequency = 'weekly' then
      v_start := v_setting.start_date + ((v_cycle - 1) * 7 * v_setting.interval_count);
      v_due := v_start;
      v_end := v_due + (6 + v_setting.grace_days);
    else
      v_start := (v_setting.start_date + make_interval(months => ((v_cycle - 1) * v_setting.interval_count)))::date;
      v_due := make_date(
        extract(year from v_start)::int,
        extract(month from v_start)::int,
        coalesce(v_setting.due_day_of_month, extract(day from v_setting.start_date)::int)
      );
      v_end := (v_due + v_setting.grace_days);
    end if;

    insert into public.recurring_cycles (
      collection_id,
      recurring_setting_id,
      cycle_number,
      starts_on,
      due_on,
      ends_on,
      status
    )
    values (
      p_collection_id,
      v_setting.id,
      v_cycle,
      v_start,
      v_due,
      v_end,
      case
        when current_date between v_start and v_end then 'collecting'
        when current_date > v_end then 'closed'
        else 'scheduled'
      end
    )
    returning id into v_cycle_id;

    insert into public.recurring_cycle_obligations (
      cycle_id,
      collection_id,
      participant_id,
      expected_amount,
      status
    )
    select
      v_cycle_id,
      p_collection_id,
      p.id,
      v_setting.contribution_amount,
      'pending'
    from public.participants p
    where p.collection_id = p_collection_id
      and coalesce(p.is_active, true) = true
      and coalesce(p.participation_status, 'active') <> 'cancelled';

    v_created := v_created + 1;
  end loop;

  update public.recurring_settings
  set schedule_locked = true,
      updated_at = now()
  where collection_id = p_collection_id;

  return v_created;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."generate_recurring_schedule"(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."generate_recurring_schedule"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."generate_recurring_schedule"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."generate_recurring_schedule"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."generate_recurring_schedule"(uuid) FROM "anon", "authenticated";
