-- ============================================================================
-- ROOFMINT — Live notification bell in the client header
-- Run this in your Supabase SQL Editor.
--
-- The header's notification bell subscribes to postgres_changes on
-- `notifications`, but that table was never added to the realtime
-- publication (only properties/enquiries/agents were, back in the initial
-- schema) — without this, the unread badge would only update on page
-- reload, not live.
-- ============================================================================

alter publication supabase_realtime add table notifications;
