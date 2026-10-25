CREATE OR REPLACE FUNCTION public.reconcile_field_obligation (
  p_obligation_type text,
  p_obligation_id   uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_paid numeric := 0;
  v_expected numeric := 0;
begin
  if p_obligation_type is null
     or p_obligation_id is null then
    return;
  end if;

  select coalesce(sum(effective_amount), 0)
    into v_paid
  from public.field_contribution_effective_ledger
  where obligation_type = p_obligation_type
    and obligation_id = p_obligation_id;

  if p_obligation_type = 'recurring' then
    select coalesce(expected_amount, 0)
      into v_expected
    from public.recurring_cycle_obligations
    where id = p_obligation_id;

    if not found then
      return;
    end if;

    update public.recurring_cycle_obligations
    set
      paid_amount = v_paid,
      status = case
        when status in ('waived', 'cancelled') then status
        when v_paid <= 0 then 'pending'
        when v_paid >= v_expected then 'paid'
        else 'partially_paid'
      end,
      paid_at = case
        when v_paid >= v_expected and v_expected > 0
          then coalesce(paid_at, now())
        else null
      end
    where id = p_obligation_id;

    return;
  end if;

  if p_obligation_type = 'rotation' then
    select coalesce(expected_amount, 0)
      into v_expected
    from public.rotation_cycle_obligations
    where id = p_obligation_id;

    if not found then
      return;
    end if;

    update public.rotation_cycle_obligations
    set
      paid_amount = v_paid,
      status = case
        when v_paid >= v_expected and v_expected > 0
          then 'paid'
        when status = 'paid' and v_paid < v_expected
          then 'pending'
        else status
      end
    where id = p_obligation_id;

    return;
  end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."reconcile_field_obligation"(text, uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."reconcile_field_obligation"(text, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."reconcile_field_obligation"(text, uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."reconcile_field_obligation"(text, uuid) FROM PUBLIC, "anon", "authenticated";
