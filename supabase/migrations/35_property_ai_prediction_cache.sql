-- Caches the 5-Year Price Predictor's output per property instead of
-- calling Gemini live on every visitor click — an admin generates it once
-- (or regenerates it), visitors then see it instantly. ai_prediction stores
-- the exact JSON shape the API returns; generated_at drives an "as of" label
-- so a cached (not live) figure is never presented as real-time.
alter table properties add column if not exists ai_prediction jsonb;
alter table properties add column if not exists ai_prediction_generated_at timestamptz;
