-- A short, random code printed unobtrusively on each bill's PDF (not
-- labeled as a "security code" — just a small reference number in the
-- footer). It has no relationship to the bill's visible content, so it
-- can't be guessed or derived from a bill number/amount someone can see —
-- only looked up against our own records. Lets admin tell a genuine,
-- unedited Roofmint bill apart from a fabricated or altered one: paste the
-- bill number + code into Admin > Billing > Verify Bill, and it either
-- matches our stored record (showing the real name/amount/date to compare
-- against whatever is being presented) or it doesn't.

create or replace function generate_verification_code()
returns text
language sql
set search_path = public
as $$
  select upper(substr(md5(gen_random_uuid()::text), 1, 8));
$$;

alter table bills add column if not exists verification_code text;

update bills set verification_code = generate_verification_code() where verification_code is null;

alter table bills alter column verification_code set default generate_verification_code();
alter table bills alter column verification_code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bills_verification_code_key'
  ) then
    alter table bills add constraint bills_verification_code_key unique (verification_code);
  end if;
end $$;

notify pgrst, 'reload schema';
