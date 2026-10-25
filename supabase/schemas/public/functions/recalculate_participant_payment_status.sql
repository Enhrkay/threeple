CREATE OR REPLACE FUNCTION public.recalculate_participant_payment_status (
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
  v_expected_amount numeric(14,2);
  v_deadline timestamptz;
  v_current_status text;

  v_total_paid numeric(14,2);
  v_pending_count integer;
  v_refunded_count integer;

  v_new_status text;
begin
  select
    p.collection_id,
    p.expected_amount,
    p.payment_status,
    c.collection_mode,
    c.deadline
  into
    v_collection_id,
    v_expected_amount,
    v_current_status,
    v_collection_mode,
    v_deadline
  from public.participants p
  join public.collections c
    on c.id = p.collection_id
  where p.id = p_participant_id;

  if not found then
    return;
  end if;

  if v_current_status in (
    'not_required',
    'exempted'
  ) then
    return;
  end if;

  if v_collection_mode in (
    'recurring_dues',
    'rotating_pool'
  ) then
    raise exception
      'Use the mode-specific participant reconciliation function for this Collection.';
  end if;

  select
    coalesce(
      sum(
        case
          when pay.status = 'success'
            and pay.verified_at is not null
          then pay.amount

          when pay.status = 'partially_refunded'
            and pay.verified_at is not null
          then greatest(
            pay.amount - coalesce(pay.refunded_amount, 0),
            0
          )

          else 0
        end
      ),
      0
    ),

    count(*) filter (
      where pay.status in (
        'initiated',
        'pending'
      )
    ),

    count(*) filter (
      where pay.status = 'refunded'
    )

  into
    v_total_paid,
    v_pending_count,
    v_refunded_count

  from public.payments pay

  where pay.participant_id = p_participant_id
    and pay.collection_id = v_collection_id
    and pay.obligation_id is null
    and pay.recurring_obligation_id is null
    and pay.rotation_obligation_id is null;

  if v_expected_amount is null then
    if v_total_paid > 0 then
      v_new_status := 'paid';

    elsif v_refunded_count > 0 then
      v_new_status := 'refunded';

    elsif v_pending_count > 0 then
      v_new_status := 'pending';

    else
      v_new_status := 'unpaid';
    end if;

  else
    if v_total_paid >= v_expected_amount then
      v_new_status := 'paid';

    elsif v_total_paid > 0 then
      v_new_status := 'partial';

    elsif v_refunded_count > 0 then
      v_new_status := 'refunded';

    elsif v_pending_count > 0 then
      v_new_status := 'pending';

    elsif
      v_deadline is not null
      and v_deadline < now()
    then
      v_new_status := 'overdue';

    else
      v_new_status := 'unpaid';
    end if;
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

GRANT EXECUTE ON FUNCTION "public"."recalculate_participant_payment_status"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."recalculate_participant_payment_status"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."recalculate_participant_payment_status"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."recalculate_participant_payment_status"(uuid) FROM PUBLIC, "anon", "authenticated";
