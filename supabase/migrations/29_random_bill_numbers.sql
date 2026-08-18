-- ============================================================================
-- ROOFMINT — Randomize bill numbers
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- 25_bills.sql generated bill numbers off a plain sequence (RM-INV-000001,
-- 000002, ...), which reveals how many bills exist and in what order to
-- anyone who sees one. Replace it with a random 6-digit number, retrying on
-- collision (checked against the `bills.bill_number` unique constraint,
-- which still backstops this against any race between concurrent inserts).
-- ============================================================================

create or replace function generate_bill_number()
returns text
language plpgsql
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'RM-INV-' || lpad(floor(random() * 1000000)::text, 6, '0');
    exit when not exists (select 1 from bills where bill_number = candidate);
  end loop;
  return candidate;
end;
$$;
