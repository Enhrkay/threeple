-- ============================================================
-- Threeple
-- Recurring payment reconciliation
--
-- Captures the live recurring-dues reconciliation functions
-- and payment relationship validation.
-- ============================================================

create or replace function public.recalculate_recurring_obligation(
  p_recurring_obligation_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_expected_amount numeric(14,2);
  v_existing_status text;
  v_paid_amount numeric(14,2);
begin
  select
    rco.expected_amount,
    rco.status
  into
    v_expected_amount,
    v_existing_status
  from public.recurring_cycle_obligations rco
  where rco.id = p_recurring_obligation_id;

  if not found then
    return;
  end if;

  if v_existing_status in ('waived', 'cancelled') then
    return;
  end if;

  select
    coalesce(
      sum(
        case
          when p.status = 'success'
            and p.verified_at is not null
          then p.amount

          when p.status = 'partially_refunded'
            and p.verified_at is not null
          then greatest(
            p.amount - p.refunded_amount,
            0
          )

          else 0
        end
      ),
      0
    )
  into v_paid_amount
  from public.payments p
  where p.recurring_obligation_id =
    p_recurring_obligation_id;

  update public.recurring_cycle_obligations
  set
    paid_amount = v_paid_amount,

    status =
      case
        when v_paid_amount >= v_expected_amount
          then 'paid'

        when v_paid_amount > 0
          then 'partially_paid'

        else 'pending'
      end,

    paid_at =
      case
        when v_paid_amount >= v_expected_amount
          then coalesce(paid_at, now())

        else null
      end,

    updated_at = now()

  where id = p_recurring_obligation_id;
end;
$function$;


create or replace function public.recalculate_recurring_participant_payment_status(
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

  v_due_obligations integer;
  v_paid_obligations integer;
  v_partial_obligations integer;
  v_overdue_obligations integer;

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

  if v_collection_mode <> 'recurring_dues' then
    return;
  end if;

  if v_current_status in (
    'not_required',
    'exempted'
  ) then
    return;
  end if;

  select
    count(*) filter (
      where rc.due_on <= current_date
        and rco.status not in ('waived', 'cancelled')
    ),

    count(*) filter (
      where rc.due_on <= current_date
        and rco.status = 'paid'
    ),

    count(*) filter (
      where rc.due_on <= current_date
        and rco.status = 'partially_paid'
    ),

    count(*) filter (
      where rc.due_on < current_date
        and rco.status in ('pending', 'partially_paid')
    )

  into
    v_due_obligations,
    v_paid_obligations,
    v_partial_obligations,
    v_overdue_obligations

  from public.recurring_cycle_obligations rco

  join public.recurring_cycles rc
    on rc.id = rco.cycle_id

  where rco.participant_id = p_participant_id
    and rco.collection_id = v_collection_id;

  if v_overdue_obligations > 0 then
    v_new_status := 'overdue';

  elsif v_partial_obligations > 0 then
    v_new_status := 'partial';

  elsif
    v_due_obligations > 0
    and v_paid_obligations = v_due_obligations
  then
    v_new_status := 'paid';

  else
    v_new_status := 'unpaid';
  end if;

  perform set_config(
    'threeple.internal_reconciliation',
    'on',
    true
  );

  update public.participants
  set payment_status = v_new_status
  where id = p_participant_id;

  perform set_config(
    'threeple.internal_reconciliation',
    'off',
    true
  );
end;
$function$;


create or replace function public.validate_payment_relationships()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_participant_collection uuid;

  v_obligation_participant uuid;
  v_obligation_collection uuid;

  v_recurring_obligation_participant uuid;
  v_recurring_obligation_collection uuid;
begin
  select p.collection_id
  into v_participant_collection
  from public.participants p
  where p.id = new.participant_id;

  if v_participant_collection is null then
    raise exception 'Participant does not exist';
  end if;

  if v_participant_collection <> new.collection_id then
    raise exception
      'Participant does not belong to this Collection';
  end if;

  if new.obligation_id is not null then
    select
      po.participant_id,
      cc.collection_id
    into
      v_obligation_participant,
      v_obligation_collection
    from public.participant_obligations po
    join public.collection_cycles cc
      on cc.id = po.cycle_id
    where po.id = new.obligation_id;

    if v_obligation_participant is null then
      raise exception 'Payment obligation does not exist';
    end if;

    if v_obligation_participant <> new.participant_id then
      raise exception
        'Payment obligation does not belong to this participant';
    end if;

    if v_obligation_collection <> new.collection_id then
      raise exception
        'Payment obligation does not belong to this Collection';
    end if;
  end if;

  if new.recurring_obligation_id is not null then
    select
      rco.participant_id,
      rco.collection_id
    into
      v_recurring_obligation_participant,
      v_recurring_obligation_collection
    from public.recurring_cycle_obligations rco
    where rco.id = new.recurring_obligation_id;

    if v_recurring_obligation_participant is null then
      raise exception
        'Recurring payment obligation does not exist';
    end if;

    if v_recurring_obligation_participant <> new.participant_id then
      raise exception
        'Recurring payment obligation does not belong to this participant';
    end if;

    if v_recurring_obligation_collection <> new.collection_id then
      raise exception
        'Recurring payment obligation does not belong to this Collection';
    end if;
  end if;

  return new;
end;
$function$;


create or replace function public.handle_payment_reconciliation()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_collection_mode text;
begin
  if new.obligation_id is not null then
    perform public.recalculate_obligation(
      new.obligation_id
    );
  end if;

  if new.recurring_obligation_id is not null then
    perform public.recalculate_recurring_obligation(
      new.recurring_obligation_id
    );
  end if;

  select c.collection_mode
  into v_collection_mode
  from public.collections c
  where c.id = new.collection_id;

  if v_collection_mode = 'rotating_pool' then
    perform public.recalculate_rotation_participant_payment_status(
      new.participant_id
    );

  elsif v_collection_mode = 'recurring_dues' then
    perform public.recalculate_recurring_participant_payment_status(
      new.participant_id
    );

  else
    perform public.recalculate_participant_payment_status(
      new.participant_id
    );
  end if;

  return new;
end;
$function$;
