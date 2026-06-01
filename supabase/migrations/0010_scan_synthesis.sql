-- Clerow master-AI synthesis — the "what all the AIs collectively think" layer.
--
-- After a multi-engine scan, one model reads every engine's answer to the
-- primary prompt and produces a short collective verdict + the single
-- highest-leverage next move (lib/scan/synthesize.ts). Numeric scores stay
-- owned by the snapshot math (lib/scan/snapshot.ts); this is a narrative layer
-- on top. Shape: { verdict, consensus, divergence, bestFix }. Null until the
-- background synthesis fills it in (and only for multi-engine scans — a single
-- free-tier engine has nothing to synthesize).

alter table public.scans add column if not exists synthesis jsonb;
