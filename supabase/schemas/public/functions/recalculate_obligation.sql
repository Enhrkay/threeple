CREATE OR REPLACE FUNCTION public.recalculate_obligation (
  p_obligation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare

  v_amount_due numeric(14,2);
  v_due_date date;
  v_existing_status text;
  v_amount_paid numeric(14,2);

begin

  select
    po.amount_due,
    po.due_date,
    po.status

  into
    v_amount_due,
    v_due_date,
    v_existing_status

  from public.participant_obligations po

  where po.id = p_obligation_id;


  if not found then
    return;
  end if;


  -- Exempt obligations remain exempt.
  if v_existing_status = 'exempted' then
    return;
  end if;


  -- Calculate effective money received.
  --
  -- SUCCESS:
  -- full amount counts
  --
  -- PARTIALLY REFUNDED:
  -- amount minus refund counts
  --
  -- REFUNDED / FAILED / PENDING:
  -- zero counts
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

  into v_amount_paid

  from public.payments p

  where p.obligation_id = p_obligation_id;


  perform set_config(
    'threeple.internal_reconciliation',
    'on',
    true
  );


  update public.participant_obligations

  set
    amount_paid = v_amount_paid,

    status =
      case

        when v_amount_paid >= v_amount_due
          then 'paid'

        when v_amount_paid > 0
          then 'partial'

        when v_due_date < current_date
          then 'overdue'

        else 'unpaid'

      end

  where id = p_obligation_id;


  perform set_config(
    'threeple.internal_reconciliation',
    'off',
    true
  );

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."recalculate_obligation"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."recalculate_obligation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."recalculate_obligation"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."recalculate_obligation"(uuid) FROM PUBLIC, "anon", "authenticated";
