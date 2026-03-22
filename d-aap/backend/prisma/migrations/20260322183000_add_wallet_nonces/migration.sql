CREATE TABLE IF NOT EXISTS "wallet_nonces" (
    "id" SERIAL NOT NULL,
    "wallet_address" VARCHAR(42),
    "nonce_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_nonces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_nonces_nonce_hash_key"
    ON "wallet_nonces"("nonce_hash");

CREATE INDEX IF NOT EXISTS "wallet_nonces_wallet_address_expires_at_idx"
    ON "wallet_nonces"("wallet_address", "expires_at");

CREATE INDEX IF NOT EXISTS "wallet_nonces_used_at_idx"
    ON "wallet_nonces"("used_at");

