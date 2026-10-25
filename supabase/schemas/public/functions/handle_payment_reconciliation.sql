CREATE OR REPLACE FUNCTION public.handle_payment_reconciliation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_collection_mode text;
begin
  -- Legacy recurring obligation reconciliation.
  if new.obligation_id is not null then
    perform public.recalculate_obligation(
      new.obligation_id
    );
  end if;

  -- New recurring-dues obligation reconciliation.
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

GRANT EXECUTE ON FUNCTION "public"."handle_payment_reconciliation"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_payment_reconciliation"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_payment_reconciliation"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."handle_payment_reconciliation"() FROM PUBLIC, "anon", "authenticated";
