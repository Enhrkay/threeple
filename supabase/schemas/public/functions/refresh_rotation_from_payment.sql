CREATE OR REPLACE FUNCTION public.refresh_rotation_from_payment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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

GRANT EXECUTE ON FUNCTION "public"."refresh_rotation_from_payment"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."refresh_rotation_from_payment"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."refresh_rotation_from_payment"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."refresh_rotation_from_payment"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."refresh_rotation_from_payment"() FROM "anon", "authenticated";
