import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Schema enforces one UserWallet per user (`user_id` unique).
 * This script verifies there are no duplicate `user_id` rows (legacy DBs).
 */
async function main() {
    console.log("--- Verify one wallet per user ---");

    const duplicates = await prisma.$queryRaw<
        { user_id: number; cnt: bigint }[]
    >`
        SELECT user_id, COUNT(*)::bigint AS cnt
        FROM user_wallets
        GROUP BY user_id
        HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
        console.log("OK: no duplicate user_id in user_wallets.");
    } else {
        console.warn("Found users with multiple wallet rows:", duplicates);
        console.warn("Fix manually or restore from backup; schema expects 1:1.");
    }

    console.log("--- Done ---");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
