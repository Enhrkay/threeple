CREATE OR REPLACE FUNCTION public.recalculate_recurring_participant_payment_status (
  p_participant_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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

  -- Preserve explicit exemptions.
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

GRANT EXECUTE ON FUNCTION "public"."recalculate_recurring_participant_payment_status"(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."recalculate_recurring_participant_payment_status"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."recalculate_recurring_participant_payment_status"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."recalculate_recurring_participant_payment_status"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."recalculate_recurring_participant_payment_status"(uuid) FROM "anon", "authenticated";
