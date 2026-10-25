CREATE OR REPLACE FUNCTION public.apply_collection_contribution_rules()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  -- Once money has started moving, financial rules are immutable.
  if tg_op = 'UPDATE'
     and old.financial_rules_locked = true
     and (
       new.target_amount is distinct from old.target_amount
       or new.expected_participant_count is distinct from old.expected_participant_count
       or new.contribution_amount_policy is distinct from old.contribution_amount_policy
       or new.default_amount is distinct from old.default_amount
       or new.currency is distinct from old.currency
       or new.collection_mode is distinct from old.collection_mode
     )
  then
    raise exception
      'Collection financial rules are locked because verified payments have started.';
  end if;

  if new.contribution_amount_policy = 'calculated_equal_share' then
    if new.target_amount is null or new.target_amount <= 0 then
      raise exception
        'A positive target amount is required for an equal-share collection.';
    end if;

    if new.expected_participant_count is null
       or new.expected_participant_count <= 0
    then
      raise exception
        'Expected participant count is required for an equal-share collection.';
    end if;

    new.calculated_contribution_amount :=
      round(
        new.target_amount / new.expected_participant_count,
        2
      );

    -- default_amount remains the canonical per-person amount used by
    -- existing Threeple payment/join code.
    new.default_amount :=
      new.calculated_contribution_amount;

    new.allow_custom_amount := false;
  elsif new.contribution_amount_policy = 'fixed_per_person' then
    new.calculated_contribution_amount := null;
    new.allow_custom_amount := false;
  elsif new.contribution_amount_policy = 'flexible' then
    new.calculated_contribution_amount := null;
    new.allow_custom_amount := true;
  elsif new.contribution_amount_policy = 'schedule_based' then
    new.calculated_contribution_amount := null;
  end if;

  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."apply_collection_contribution_rules"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."apply_collection_contribution_rules"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."apply_collection_contribution_rules"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_collection_contribution_rules"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."apply_collection_contribution_rules"() FROM "anon", "authenticated";
