CREATE OR REPLACE FUNCTION public.generate_rotation_schedule (
  p_collection_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_settings record;
  v_member record;
  v_member_count integer;
  v_cycle_id uuid;
  v_cycle_date date;
  v_cycle_number integer := 0;
  v_expected_gross numeric;
  v_coordinator_fee numeric;
  v_expected_net numeric;
  v_created integer := 0;
begin
  if p_collection_id is null then
    raise exception 'Collection ID is required.';
  end if;

  perform 1
  from public.collections c
  where c.id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection not found.';
  end if;

  select *
  into v_settings
  from public.rotation_settings rs
  where rs.collection_id = p_collection_id;

  if not found then
    raise exception 'Rotation settings are not configured.';
  end if;

  if exists (
    select 1
    from public.rotation_cycles rc
    where rc.collection_id = p_collection_id
  ) then
    raise exception 'Rotation schedule already exists.';
  end if;

  select count(*)::integer
  into v_member_count
  from public.rotation_members rm
  where rm.collection_id = p_collection_id
    and rm.is_active = true;

  if v_member_count < 2 then
    raise exception 'At least two active rotation members are required.';
  end if;

  v_expected_gross :=
    round(
      v_settings.contribution_amount *
      v_member_count,
      2
    );

  if v_settings.coordinator_fee_mode = 'fixed' then
    v_coordinator_fee :=
      round(v_settings.coordinator_fee_value, 2);

  elsif v_settings.coordinator_fee_mode = 'percentage' then
    if v_settings.coordinator_fee_value > 100 then
      raise exception 'Coordinator percentage cannot exceed 100.';
    end if;

    v_coordinator_fee :=
      round(
        v_expected_gross *
        (v_settings.coordinator_fee_value / 100.0),
        2
      );

  else
    v_coordinator_fee := 0;
  end if;

  if v_coordinator_fee >= v_expected_gross then
    raise exception 'Coordinator fee must be lower than the gross cycle pot.';
  end if;

  for v_member in
    select
      rm.participant_id,
      rm.recipient_position
    from public.rotation_members rm
    where rm.collection_id = p_collection_id
      and rm.is_active = true
    order by rm.recipient_position
  loop
    v_cycle_number := v_cycle_number + 1;

    if v_settings.frequency = 'weekly' then
      v_cycle_date :=
        v_settings.start_date +
        ((v_cycle_number - 1) * 7);

    elsif v_settings.frequency = 'biweekly' then
      v_cycle_date :=
        v_settings.start_date +
        ((v_cycle_number - 1) * 14);

    else
      v_cycle_date :=
        (
          v_settings.start_date +
          make_interval(
            months => v_cycle_number - 1
          )
        )::date;
    end if;

    -- At schedule-generation time, platform/processor fees are unknown.
    -- They will be populated from verified payments later.
    v_expected_net :=
      greatest(
        round(
          v_expected_gross -
          v_coordinator_fee,
          2
        ),
        0
      );

    insert into public.rotation_cycles (
      collection_id,
      cycle_number,
      recipient_participant_id,
      scheduled_date,
      contribution_amount,
      expected_member_count,
      expected_gross_amount,
      coordinator_fee_amount,
      threeple_platform_fee_amount,
      processor_fee_amount,
      expected_recipient_net,
      status
    )
    values (
      p_collection_id,
      v_cycle_number,
      v_member.participant_id,
      v_cycle_date,
      v_settings.contribution_amount,
      v_member_count,
      v_expected_gross,
      v_coordinator_fee,
      0,
      0,
      v_expected_net,
      'scheduled'
    )
    returning id
    into v_cycle_id;

    insert into public.rotation_cycle_obligations (
      cycle_id,
      participant_id,
      amount_due
    )
    select
      v_cycle_id,
      rm.participant_id,
      v_settings.contribution_amount
    from public.rotation_members rm
    where rm.collection_id = p_collection_id
      and rm.is_active = true;

    v_created := v_created + 1;
  end loop;

  update public.rotation_settings
  set
    status = 'active',
    updated_at = now()
  where collection_id = p_collection_id;

  return v_created;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."generate_rotation_schedule"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."generate_rotation_schedule"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."generate_rotation_schedule"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."generate_rotation_schedule"(uuid) FROM PUBLIC, "anon", "authenticated";
