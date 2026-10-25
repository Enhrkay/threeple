-- ============================================================
-- Threeple
-- Canonical rotating-pool / Ajo functions
-- ============================================================

create or replace function public.generate_rotation_schedule(
  p_collection_id uuid
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
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


create or replace function public.recalculate_rotation_participant_payment_status(
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_collection_id uuid;
  v_collection_mode text;
  v_current_status text;

  v_total_obligations integer := 0;
  v_paid_obligations integer := 0;
  v_partial_obligations integer := 0;
  v_started_obligations integer := 0;

  v_new_status text;
begin
  select
    p.collection_id,
    p.payment_status,
    c.collection_mode
  into
    v_collection_id,
    v_current_status,
    v_collection_mode
  from public.participants p
  join public.collections c
    on c.id = p.collection_id
  where p.id = p_participant_id;

  if not found then
    return;
  end if;

  if v_collection_mode <> 'rotating_pool' then
    raise exception
      'Participant does not belong to a rotating-pool Collection.';
  end if;

  if v_current_status in (
    'not_required',
    'exempted'
  ) then
    return;
  end if;

  select
    count(*) filter (
      where rco.status <> 'waived'
    )::integer,

    count(*) filter (
      where rco.status = 'paid'
    )::integer,

    count(*) filter (
      where rco.status = 'partial'
    )::integer,

    count(*) filter (
      where
        rco.status in (
          'paid',
          'partial'
        )
        or coalesce(
          rco.amount_paid,
          0
        ) > 0
    )::integer
  into
    v_total_obligations,
    v_paid_obligations,
    v_partial_obligations,
    v_started_obligations
  from public.rotation_cycle_obligations rco
  join public.rotation_cycles rc
    on rc.id = rco.cycle_id
  where rco.participant_id =
      p_participant_id
    and rc.collection_id =
      v_collection_id
    and rc.status <> 'cancelled';

  if v_total_obligations = 0 then
    v_new_status := 'unpaid';

  elsif v_paid_obligations =
        v_total_obligations then
    v_new_status := 'paid';

  elsif v_partial_obligations > 0
        or v_started_obligations > 0 then
    v_new_status := 'partial';

  else
    v_new_status := 'unpaid';
  end if;

  perform set_config(
    'threeple.internal_reconciliation',
    'on',
    true
  );

  update public.participants
  set payment_status =
    v_new_status
  where id =
    p_participant_id;

  perform set_config(
    'threeple.internal_reconciliation',
    'off',
    true
  );
end;
$function$;


create or replace function public.refresh_rotation_cycle(
  p_cycle_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_platform_fee numeric;
  v_processor_fee numeric;
  v_expected_gross numeric;
  v_coordinator_fee numeric;
  v_collected numeric;
  v_outstanding_count integer;
  v_current_status text;
  v_net numeric;
begin
  select
    rc.expected_gross_amount,
    rc.coordinator_fee_amount,
    rc.status
  into
    v_expected_gross,
    v_coordinator_fee,
    v_current_status
  from public.rotation_cycles rc
  where rc.id = p_cycle_id
  for update;

  if not found then
    raise exception 'Rotation cycle not found.';
  end if;

  select
    coalesce(
      sum(
        greatest(
          coalesce(p.platform_fee_amount, 0),
          0
        )
      ),
      0
    ),
    coalesce(
      sum(
        greatest(
          coalesce(p.processor_fee_amount, 0),
          0
        )
      ),
      0
    )
  into
    v_platform_fee,
    v_processor_fee
  from public.payments p
  where p.rotation_cycle_id =
      p_cycle_id
    and p.status = 'success'
    and p.verified_at is not null;

  select
    coalesce(
      sum(rco.amount_paid),
      0
    ),
    count(*) filter (
      where rco.status in (
        'pending',
        'partial'
      )
    )::integer
  into
    v_collected,
    v_outstanding_count
  from public.rotation_cycle_obligations rco
  where rco.cycle_id =
    p_cycle_id;

  v_net :=
    greatest(
      round(
        coalesce(v_collected, 0) -
        coalesce(v_coordinator_fee, 0) -
        coalesce(v_platform_fee, 0) -
        coalesce(v_processor_fee, 0),
        2
      ),
      0
    );

  update public.rotation_cycles
  set
    threeple_platform_fee_amount =
      round(
        coalesce(v_platform_fee, 0),
        2
      ),

    processor_fee_amount =
      round(
        coalesce(v_processor_fee, 0),
        2
      ),

    expected_recipient_net =
      v_net,

    status =
      case
        when v_current_status = 'cancelled'
          then 'cancelled'

        when v_outstanding_count = 0
             and coalesce(v_collected, 0) > 0
          then 'settled'

        when coalesce(v_collected, 0) > 0
          then 'open'

        else v_current_status
      end,

    opened_at =
      case
        when coalesce(v_collected, 0) > 0
          then coalesce(opened_at, now())
        else opened_at
      end,

    settled_at =
      case
        when v_outstanding_count = 0
             and coalesce(v_collected, 0) > 0
          then coalesce(settled_at, now())
        else null
      end

  where id = p_cycle_id;
end;
$function$;


create or replace function public.refresh_rotation_from_payment()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_old_obligation uuid;
  v_old_cycle uuid;
  v_new_obligation uuid;
  v_new_cycle uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old_obligation :=
      old.rotation_obligation_id;

    v_old_cycle :=
      old.rotation_cycle_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new_obligation :=
      new.rotation_obligation_id;

    v_new_cycle :=
      new.rotation_cycle_id;
  end if;

  if v_old_obligation is not null then
    perform public.refresh_rotation_obligation(
      v_old_obligation
    );
  end if;

  if v_new_obligation is not null
     and v_new_obligation is distinct from
       v_old_obligation then
    perform public.refresh_rotation_obligation(
      v_new_obligation
    );
  elsif v_new_obligation is not null
        and tg_op = 'UPDATE' then
    perform public.refresh_rotation_obligation(
      v_new_obligation
    );
  end if;

  if v_old_cycle is not null then
    perform public.refresh_rotation_cycle(
      v_old_cycle
    );
  end if;

  if v_new_cycle is not null
     and v_new_cycle is distinct from
       v_old_cycle then
    perform public.refresh_rotation_cycle(
      v_new_cycle
    );
  elsif v_new_cycle is not null
        and tg_op = 'UPDATE' then
    perform public.refresh_rotation_cycle(
      v_new_cycle
    );
  end if;

  return coalesce(new, old);
end;
$function$;


create or replace function public.refresh_rotation_obligation(
  p_obligation_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_due numeric;
  v_paid numeric;
  v_status text;
  v_paid_at timestamptz;
begin
  select
    rco.amount_due
  into v_due
  from public.rotation_cycle_obligations rco
  where rco.id = p_obligation_id
  for update;

  if not found then
    raise exception 'Rotation obligation not found.';
  end if;

  select
    coalesce(
      sum(
        greatest(
          coalesce(p.amount, 0) -
          coalesce(p.refunded_amount, 0),
          0
        )
      ),
      0
    ),
    max(p.verified_at)
  into
    v_paid,
    v_paid_at
  from public.payments p
  where p.rotation_obligation_id =
      p_obligation_id
    and p.status = 'success'
    and p.verified_at is not null;

  v_paid :=
    round(
      coalesce(v_paid, 0),
      2
    );

  if v_paid <= 0 then
    v_status := 'pending';
    v_paid_at := null;

  elsif v_paid + 0.001 < v_due then
    v_status := 'partial';
    v_paid_at := null;

  else
    v_status := 'paid';
  end if;

  update public.rotation_cycle_obligations
  set
    amount_paid = v_paid,
    status = v_status,
    paid_at =
      case
        when v_status = 'paid'
        then coalesce(v_paid_at, now())
        else null
      end
  where id = p_obligation_id;
end;
$function$;


create or replace function public.reorder_rotation_members(
  p_collection_id uuid,
  p_participant_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_existing_count integer;
  v_requested_count integer;
  v_distinct_count integer;
  v_missing_count integer;
  v_index integer;
begin
  if p_collection_id is null then
    raise exception 'Collection ID is required.';
  end if;

  if p_participant_ids is null
     or array_length(p_participant_ids, 1) is null then
    raise exception 'Recipient order is required.';
  end if;

  if exists (
    select 1
    from public.rotation_cycles rc
    where rc.collection_id = p_collection_id
  ) then
    raise exception 'Recipient order cannot be changed after rotation cycles exist.';
  end if;

  perform 1
  from public.collections c
  where c.id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection not found.';
  end if;

  select count(*)::integer
  into v_existing_count
  from public.rotation_members rm
  where rm.collection_id = p_collection_id
    and rm.is_active = true;

  v_requested_count :=
    cardinality(p_participant_ids);

  select count(distinct x)::integer
  into v_distinct_count
  from unnest(p_participant_ids) as t(x);

  if v_requested_count <> v_existing_count then
    raise exception 'Recipient order must include every active rotation member.';
  end if;

  if v_distinct_count <> v_requested_count then
    raise exception 'Recipient order contains duplicate participants.';
  end if;

  select count(*)::integer
  into v_missing_count
  from unnest(p_participant_ids) as t(participant_id)
  where not exists (
    select 1
    from public.rotation_members rm
    where rm.collection_id = p_collection_id
      and rm.participant_id = t.participant_id
      and rm.is_active = true
  );

  if v_missing_count > 0 then
    raise exception 'Recipient order contains an invalid rotation member.';
  end if;

  update public.rotation_members
  set recipient_position =
    recipient_position + 100000
  where collection_id = p_collection_id
    and is_active = true;

  for v_index in
    1..v_requested_count
  loop
    update public.rotation_members
    set recipient_position =
      v_index
    where collection_id =
      p_collection_id
      and participant_id =
        p_participant_ids[v_index]
      and is_active = true;

    if not found then
      raise exception 'Could not update rotation member position.';
    end if;
  end loop;

  return v_requested_count;
end;
$function$;


create or replace function public.seed_rotation_members(
  p_collection_id uuid
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_count integer;
begin
  if p_collection_id is null then
    raise exception 'Collection ID is required.';
  end if;

  if exists (
    select 1
    from public.rotation_cycles rc
    where rc.collection_id = p_collection_id
  ) then
    raise exception 'Rotation member order cannot be reseeded after cycles exist.';
  end if;

  delete from public.rotation_members
  where collection_id = p_collection_id;

  insert into public.rotation_members (
    collection_id,
    participant_id,
    recipient_position
  )
  select
    p_collection_id,
    p.id,
    row_number() over (
      order by p.created_at asc, p.id asc
    )::integer
  from public.participants p
  where p.collection_id = p_collection_id
    and p.is_active = true;

  get diagnostics v_count = row_count;

  if v_count < 2 then
    raise exception 'A rotational Collection requires at least two active participants.';
  end if;

  return v_count;
end;
$function$;


create or replace function public.validate_rotation_member()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_mode text;
  v_participant_collection uuid;
begin
  select collection_mode
  into v_mode
  from public.collections
  where id = new.collection_id;

  if v_mode <> 'rotating_pool' then
    raise exception
      'Rotation order can only be used with rotating_pool collections';
  end if;

  select collection_id
  into v_participant_collection
  from public.participants
  where id = new.participant_id;

  if v_participant_collection <> new.collection_id then
    raise exception
      'Participant does not belong to this rotating collection';
  end if;

  return new;
end;
$function$;


create or replace function public.validate_rotation_payment_link()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_cycle_collection_id uuid;
  v_obligation_cycle_id uuid;
  v_obligation_participant_id uuid;
begin
  if new.rotation_cycle_id is null
     and new.rotation_obligation_id is null then
    return new;
  end if;

  if new.rotation_cycle_id is null
     or new.rotation_obligation_id is null then
    raise exception
      'Rotation cycle and rotation obligation must be supplied together.';
  end if;

  select
    rc.collection_id
  into v_cycle_collection_id
  from public.rotation_cycles rc
  where rc.id = new.rotation_cycle_id;

  if not found then
    raise exception 'Rotation cycle not found.';
  end if;

  select
    rco.cycle_id,
    rco.participant_id
  into
    v_obligation_cycle_id,
    v_obligation_participant_id
  from public.rotation_cycle_obligations rco
  where rco.id = new.rotation_obligation_id;

  if not found then
    raise exception 'Rotation obligation not found.';
  end if;

  if v_obligation_cycle_id <> new.rotation_cycle_id then
    raise exception
      'Rotation obligation does not belong to the supplied cycle.';
  end if;

  if v_cycle_collection_id <> new.collection_id then
    raise exception
      'Rotation cycle does not belong to the payment Collection.';
  end if;

  if v_obligation_participant_id <> new.participant_id then
    raise exception
      'Rotation obligation does not belong to the payment participant.';
  end if;

  return new;
end;
$function$;
