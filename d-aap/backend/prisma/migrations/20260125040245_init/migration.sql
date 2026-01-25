-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('EMAIL_PASSWORD', 'OAUTH_GOOGLE', 'WALLET', 'BOTH');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('STAKE', 'CLAIM', 'WITHDRAW', 'EMERGENCY_WITHDRAW');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STAKE_CREATED', 'STAKE_CLAIMED', 'STAKE_WITHDRAWN', 'REWARD_AVAILABLE', 'STAKE_UNLOCKED', 'WALLET_VERIFIED', 'SYSTEM_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "chains" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "rpc_url" VARCHAR(500),
    "explorer_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255),
    "password" VARCHAR(255),
    "name" VARCHAR(200) NOT NULL,
    "avatar" VARCHAR(500),
    "bio" TEXT,
    "auth_method" "AuthMethod" NOT NULL DEFAULT 'WALLET',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255),
    "provider_name" VARCHAR(200),
    "provider_avatar" VARCHAR(500),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "wallet_address" VARCHAR(42) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verification_tx" VARCHAR(66),
    "verified_at" TIMESTAMP(3),
    "wallet_type" VARCHAR(50) NOT NULL DEFAULT 'MetaMask',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "device_name" VARCHAR(100),
    "device_type" VARCHAR(50),
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "session_token" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staking_contracts" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "stake_token_address" VARCHAR(42) NOT NULL,
    "reward_token_address" VARCHAR(42) NOT NULL,
    "stake_token_symbol" VARCHAR(20) NOT NULL,
    "reward_token_symbol" VARCHAR(20) NOT NULL,
    "stake_token_decimals" INTEGER NOT NULL DEFAULT 6,
    "reward_token_decimals" INTEGER NOT NULL DEFAULT 18,
    "min_stake_amount" VARCHAR(78) NOT NULL DEFAULT '0',
    "max_stake_per_user" VARCHAR(78) NOT NULL DEFAULT '0',
    "total_locked" VARCHAR(78) NOT NULL DEFAULT '0',
    "total_reward_debt" VARCHAR(78) NOT NULL DEFAULT '0',
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "deployed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staking_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staking_packages" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "package_id" INTEGER NOT NULL,
    "lock_period" INTEGER NOT NULL,
    "apy" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "total_staked" VARCHAR(78) NOT NULL DEFAULT '0',
    "max_total_staked" VARCHAR(78) NOT NULL DEFAULT '0',
    "stakers_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staking_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stake_positions" (
    "id" SERIAL NOT NULL,
    "wallet_id" INTEGER NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "package_id" INTEGER NOT NULL,
    "on_chain_stake_id" INTEGER NOT NULL,
    "on_chain_package_id" INTEGER NOT NULL,
    "principal" VARCHAR(78) NOT NULL,
    "reward_total" VARCHAR(78) NOT NULL,
    "reward_claimed" VARCHAR(78) NOT NULL DEFAULT '0',
    "lock_period" INTEGER NOT NULL,
    "start_timestamp" TIMESTAMP(3) NOT NULL,
    "unlock_timestamp" TIMESTAMP(3) NOT NULL,
    "last_claim_timestamp" TIMESTAMP(3),
    "is_withdrawn" BOOLEAN NOT NULL DEFAULT false,
    "is_emergency_withdrawn" BOOLEAN NOT NULL DEFAULT false,
    "stake_tx_hash" VARCHAR(66),
    "withdraw_tx_hash" VARCHAR(66),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stake_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "wallet_id" INTEGER NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "stake_position_id" INTEGER,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" VARCHAR(78) NOT NULL,
    "tx_hash" VARCHAR(66),
    "block_number" BIGINT,
    "gas_used" VARCHAR(78),
    "gas_price" VARCHAR(78),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_statistics" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_staked" VARCHAR(78) NOT NULL DEFAULT '0',
    "total_claimed" VARCHAR(78) NOT NULL DEFAULT '0',
    "total_withdrawn" VARCHAR(78) NOT NULL DEFAULT '0',
    "active_stakes" INTEGER NOT NULL DEFAULT 0,
    "completed_stakes" INTEGER NOT NULL DEFAULT 0,
    "pending_rewards" VARCHAR(78) NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_syncs" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "contract_address" VARCHAR(42) NOT NULL,
    "last_processed_block" BIGINT NOT NULL,
    "current_block" BIGINT,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_sync_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockchain_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_events" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "contract_address" VARCHAR(42) NOT NULL,
    "tx_hash" VARCHAR(66) NOT NULL,
    "block_number" BIGINT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "event_data" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fcm_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "device_info" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chains_slug_key" ON "chains"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_deleted_at_idx" ON "users"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_id_key" ON "oauth_accounts"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_wallet_address_key" ON "user_wallets"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_verification_tx_key" ON "user_wallets"("verification_tx");

-- CreateIndex
CREATE INDEX "user_wallets_user_id_is_primary_idx" ON "user_wallets"("user_id", "is_primary");

-- CreateIndex
CREATE INDEX "user_wallets_chain_id_idx" ON "user_wallets"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_user_id_is_used_idx" ON "password_resets"("user_id", "is_used");

-- CreateIndex
CREATE INDEX "password_resets_expires_at_idx" ON "password_resets"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "staking_contracts_address_key" ON "staking_contracts"("address");

-- CreateIndex
CREATE INDEX "staking_contracts_chain_id_idx" ON "staking_contracts"("chain_id");

-- CreateIndex
CREATE INDEX "staking_packages_contract_id_is_enabled_idx" ON "staking_packages"("contract_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "staking_packages_contract_id_package_id_key" ON "staking_packages"("contract_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "stake_positions_stake_tx_hash_key" ON "stake_positions"("stake_tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "stake_positions_withdraw_tx_hash_key" ON "stake_positions"("withdraw_tx_hash");

-- CreateIndex
CREATE INDEX "stake_positions_wallet_id_idx" ON "stake_positions"("wallet_id");

-- CreateIndex
CREATE INDEX "stake_positions_contract_id_idx" ON "stake_positions"("contract_id");

-- CreateIndex
CREATE INDEX "stake_positions_package_id_idx" ON "stake_positions"("package_id");

-- CreateIndex
CREATE INDEX "stake_positions_is_withdrawn_idx" ON "stake_positions"("is_withdrawn");

-- CreateIndex
CREATE INDEX "stake_positions_unlock_timestamp_idx" ON "stake_positions"("unlock_timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "stake_positions_wallet_id_contract_id_on_chain_package_id_o_key" ON "stake_positions"("wallet_id", "contract_id", "on_chain_package_id", "on_chain_stake_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tx_hash_key" ON "transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_type_idx" ON "transactions"("wallet_id", "type");

-- CreateIndex
CREATE INDEX "transactions_chain_id_idx" ON "transactions"("chain_id");

-- CreateIndex
CREATE INDEX "transactions_stake_position_id_idx" ON "transactions"("stake_position_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_statistics_user_id_key" ON "user_statistics"("user_id");

-- CreateIndex
CREATE INDEX "blockchain_syncs_chain_id_status_idx" ON "blockchain_syncs"("chain_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_syncs_chain_id_contract_address_key" ON "blockchain_syncs"("chain_id", "contract_address");

-- CreateIndex
CREATE INDEX "blockchain_events_chain_id_event_name_processed_idx" ON "blockchain_events"("chain_id", "event_name", "processed");

-- CreateIndex
CREATE INDEX "blockchain_events_chain_id_block_number_idx" ON "blockchain_events"("chain_id", "block_number");

-- CreateIndex
CREATE INDEX "blockchain_events_chain_id_processed_created_at_idx" ON "blockchain_events"("chain_id", "processed", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_events_tx_hash_log_index_key" ON "blockchain_events"("tx_hash", "log_index");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_token_key" ON "fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "fcm_tokens_user_id_is_active_idx" ON "fcm_tokens"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "fcm_tokens_user_id_idx" ON "fcm_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staking_contracts" ADD CONSTRAINT "staking_contracts_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staking_packages" ADD CONSTRAINT "staking_packages_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "staking_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stake_positions" ADD CONSTRAINT "stake_positions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "user_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stake_positions" ADD CONSTRAINT "stake_positions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "staking_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stake_positions" ADD CONSTRAINT "stake_positions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "staking_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "user_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_stake_position_id_fkey" FOREIGN KEY ("stake_position_id") REFERENCES "stake_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_statistics" ADD CONSTRAINT "user_statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_syncs" ADD CONSTRAINT "blockchain_syncs_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_events" ADD CONSTRAINT "blockchain_events_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
