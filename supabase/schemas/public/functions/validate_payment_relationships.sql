CREATE OR REPLACE FUNCTION public.validate_payment_relationships()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_participant_collection uuid;

  v_obligation_participant uuid;
  v_obligation_collection uuid;

  v_recurring_obligation_participant uuid;
  v_recurring_obligation_collection uuid;
begin
  -- Confirm participant belongs to this collection.
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

  -- Legacy recurring obligation validation.
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

  -- New recurring-dues obligation validation.
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

GRANT EXECUTE ON FUNCTION "public"."validate_payment_relationships"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_payment_relationships"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_payment_relationships"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."validate_payment_relationships"() FROM PUBLIC, "anon", "authenticated";
