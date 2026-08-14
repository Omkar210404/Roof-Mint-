-- ============================================================================
-- ROOFMINT — Admin-curated message shown to the assigned agent
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- Agents no longer see the raw customer `message` field at all (it could
-- leak the lead's source, e.g. "Contacted via WhatsApp", or contain
-- anything a visitor typed, including abusive test junk). Instead this new
-- column is blank by default (agent sees nothing) and admin explicitly
-- writes/approves whatever text — if any — should reach the agent.
-- ============================================================================

alter table enquiries add column if not exists agent_message text;
