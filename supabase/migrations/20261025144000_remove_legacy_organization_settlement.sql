-- ============================================================
-- Threeple
-- Remove legacy organization-level settlement fields
--
-- Settlement configuration is now canonical at collection level
-- through collection_beneficiaries -> settlement_profiles.
-- ============================================================

alter table public.organizations
  drop column if exists settlement_provider,
  drop column if exists settlement_subaccount_code,
  drop column if exists settlement_bank_code,
  drop column if exists settlement_account_name,
  drop column if exists settlement_account_last4,
  drop column if exists settlement_currency,
  drop column if exists settlement_status,
  drop column if exists settlement_configured_at;
