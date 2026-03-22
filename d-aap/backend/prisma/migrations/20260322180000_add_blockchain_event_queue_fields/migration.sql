-- Add DB-backed queue fields for reliable event processing (no Redis required)
ALTER TABLE "blockchain_events"
    ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "next_attempt_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "locked_by" VARCHAR(64);

-- Helps the worker claim retryable/unlocked rows efficiently
CREATE INDEX IF NOT EXISTS "blockchain_events_processed_next_attempt_at_locked_at_idx"
    ON "blockchain_events"("processed", "next_attempt_at", "locked_at");

