import { PrismaClient, TransactionType, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === 'production';

const randomAddress = () => `0x${[...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
const randomTxHash = () => `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
const toTokenAmount = (amount: number, decimals: number) => 
    BigInt(Math.floor(amount * Math.pow(10, decimals))).toString();

async function main() {
    console.log(`🌱 Starting ${isProd ? 'production' : 'development'} seed...\n`);

    const sepolia = await prisma.chain.upsert({
        where: { id: 11155111 },
        update: {},
        create: {
            id: 11155111,
            name: 'Sepolia Testnet',
            slug: 'sepolia',
            rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
            explorerUrl: 'https://sepolia.etherscan.io',
            isActive: true,
        },
    });
    console.log(`✅ Chain: ${sepolia.name} (${sepolia.id})`);

    const contractAddress = process.env.YIELD_STAKING_ADDRESS?.toLowerCase() || '0x1234567890abcdef1234567890abcdef12345678';
    const usdtAddress = process.env.USDT_ADDRESS?.toLowerCase() || '0xusdt0000000000000000000000000000000000';
    const aureusAddress = process.env.AUREUS_ADDRESS?.toLowerCase() || '0xaureus00000000000000000000000000000000';

    const stakingContract = await prisma.stakingContract.upsert({
        where: { address: contractAddress },
        update: {},
        create: {
            chainId: sepolia.id,
            address: contractAddress,
            stakeTokenAddress: usdtAddress,
            rewardTokenAddress: aureusAddress,
            stakeTokenSymbol: 'USDT',
            rewardTokenSymbol: 'AUR',
            stakeTokenDecimals: 6,
            rewardTokenDecimals: 18,
            minStakeAmount: toTokenAmount(100, 6),
            maxStakePerUser: '0',
            totalLocked: toTokenAmount(500000, 6),
            totalRewardDebt: toTokenAmount(25000, 18),
            isPaused: false,
        },
    });
    console.log(`✅ Staking Contract: ${stakingContract.address}`);

    const packagesData = [
        { packageId: 0, lockPeriod: 90 * 86400, apy: 2000 },
        { packageId: 1, lockPeriod: 180 * 86400, apy: 2500 },
        { packageId: 2, lockPeriod: 270 * 86400, apy: 3500 },
        { packageId: 3, lockPeriod: 360 * 86400, apy: 5000 },
    ];

    const packages: Record<number, { id: number; packageId: number; lockPeriod: number; apy: number }> = {};

    for (const pkg of packagesData) {
        const created = await prisma.stakingPackage.upsert({
            where: {
                contractId_packageId: {
                    contractId: stakingContract.id,
                    packageId: pkg.packageId,
                },
            },
            update: { lockPeriod: pkg.lockPeriod, apy: pkg.apy },
            create: {
                contractId: stakingContract.id,
                packageId: pkg.packageId,
                lockPeriod: pkg.lockPeriod,
                apy: pkg.apy,
                isEnabled: true,
                totalStaked: toTokenAmount(50000 + pkg.packageId * 30000, 6),
                maxTotalStaked: '0',
                stakersCount: 10 + pkg.packageId * 5,
            },
        });
        packages[pkg.packageId] = created;
        console.log(`   📦 Package ${pkg.packageId}: ${pkg.lockPeriod / 86400} days, ${pkg.apy / 100}% APY`);
    }

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('123', 12);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@yieldstaking.com' },
        update: {},
        create: {
            email: 'admin@yieldstaking.com',
            password: hashedPassword,
            name: 'Platform Admin',
            authMethod: 'EMAIL_PASSWORD',
            role: 'ADMIN',
            status: 'ACTIVE',
            emailVerified: true,
            emailVerifiedAt: new Date(),
        },
    });
    console.log(`✅ Admin: ${adminUser.email}`);

    if (isProd) {
        const prodUser = await prisma.user.upsert({
            where: { email: 'user@yieldstaking.com' },
            update: {},
            create: {
                email: 'user@yieldstaking.com',
                password: hashedPassword,
                name: 'Demo User',
                authMethod: 'EMAIL_PASSWORD',
                role: 'USER',
                status: 'ACTIVE',
                emailVerified: true,
                emailVerifiedAt: new Date(),
            },
        });
        console.log(`✅ User: ${prodUser.email}`);

        console.log('\n🎉 Production seed completed!');
        console.log('━'.repeat(40));
        console.log('   Admin: admin@yieldstaking.com / 123');
        console.log('   User: user@yieldstaking.com / 123');
        console.log('━'.repeat(40));
        return;
    }

    // Development: create test users with wallets, stakes, transactions
    const testUsers = [
        { name: 'Alice Staker', email: 'alice@test.com', wallet: '0xalice0000000000000000000000000000000001' },
        { name: 'Bob Investor', email: 'bob@test.com', wallet: '0xbob00000000000000000000000000000000002' },
        { name: 'Charlie Whale', email: 'charlie@test.com', wallet: '0xcharlie000000000000000000000000000003' },
        { name: 'Diana Hodler', email: 'diana@test.com', wallet: '0xdiana0000000000000000000000000000004' },
        { name: 'Wallet User', email: null, wallet: '0xwallet0000000000000000000000000000005' },
    ];

    const users: { user: typeof adminUser; wallet: { id: number; walletAddress: string } }[] = [];

    for (const testUser of testUsers) {
        const user = await prisma.user.upsert({
            where: { email: testUser.email || `wallet_${testUser.wallet}@temp.local` },
            update: {},
            create: {
                email: testUser.email,
                password: testUser.email ? hashedPassword : null,
                name: testUser.name,
                authMethod: testUser.email ? 'EMAIL_PASSWORD' : 'WALLET',
                role: 'USER',
                status: 'ACTIVE',
                emailVerified: !!testUser.email,
                emailVerifiedAt: testUser.email ? new Date() : null,
            },
        });

        const wallet = await prisma.userWallet.upsert({
            where: { walletAddress: testUser.wallet },
            update: {},
            create: {
                userId: user.id,
                chainId: sepolia.id,
                walletAddress: testUser.wallet,
                isVerified: true,
                isPrimary: true,
                verifiedAt: new Date(),
                walletType: 'MetaMask',
            },
        });

        users.push({ user, wallet });
        console.log(`   👤 ${user.name} (${wallet.walletAddress.slice(0, 10)}...)`);
    }

    console.log('\n📊 Creating stake positions and transactions...');

    const now = new Date();
    let stakeIdCounter = 0;

    for (const { user, wallet } of users) {
        const numPositions = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numPositions; i++) {
            const pkgId = Math.floor(Math.random() * 4);
            const pkg = packages[pkgId];
            const stakeAmount = (Math.floor(Math.random() * 10) + 1) * 1000;
            const startDate = new Date(now.getTime() - Math.random() * 60 * 86400000);
            const unlockDate = new Date(startDate.getTime() + pkg.lockPeriod * 1000);
            const isWithdrawn = unlockDate < now && Math.random() > 0.5;
            const rewardTotal = stakeAmount * (pkg.apy / 10000) * (pkg.lockPeriod / (365 * 86400));
            const rewardClaimed = isWithdrawn ? rewardTotal : rewardTotal * Math.random() * 0.5;

            stakeIdCounter++;
            const stakeTxHash = randomTxHash();

            const position = await prisma.stakePosition.upsert({
                where: { stakeTxHash },
                update: {},
                create: {
                    walletId: wallet.id,
                    contractId: stakingContract.id,
                    packageId: pkg.id,
                    onChainStakeId: stakeIdCounter,
                    onChainPackageId: pkgId,
                    principal: toTokenAmount(stakeAmount, 6),
                    rewardTotal: toTokenAmount(rewardTotal, 18),
                    rewardClaimed: toTokenAmount(rewardClaimed, 18),
                    lockPeriod: pkg.lockPeriod,
                    startTimestamp: startDate,
                    unlockTimestamp: unlockDate,
                    lastClaimTimestamp: rewardClaimed > 0 ? new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime())) : null,
                    isWithdrawn,
                    isEmergencyWithdrawn: false,
                    stakeTxHash,
                    withdrawTxHash: isWithdrawn ? randomTxHash() : null,
                },
            });

            await prisma.transaction.upsert({
                where: { txHash: stakeTxHash },
                update: {},
                create: {
                    walletId: wallet.id,
                    chainId: sepolia.id,
                    stakePositionId: position.id,
                    type: TransactionType.STAKE,
                    status: TransactionStatus.CONFIRMED,
                    amount: toTokenAmount(stakeAmount, 6),
                    txHash: stakeTxHash,
                    blockNumber: BigInt(Math.floor(Math.random() * 1000000) + 5000000),
                    gasUsed: '150000',
                    gasPrice: '20000000000',
                    confirmedAt: startDate,
                },
            });

            if (rewardClaimed > 0) {
                const claimTxHash = randomTxHash();
                await prisma.transaction.upsert({
                    where: { txHash: claimTxHash },
                    update: {},
                    create: {
                        walletId: wallet.id,
                        chainId: sepolia.id,
                        stakePositionId: position.id,
                        type: TransactionType.CLAIM,
                        status: TransactionStatus.CONFIRMED,
                        amount: toTokenAmount(rewardClaimed, 18),
                        txHash: claimTxHash,
                        blockNumber: BigInt(Math.floor(Math.random() * 1000000) + 5500000),
                        gasUsed: '80000',
                        gasPrice: '25000000000',
                        confirmedAt: position.lastClaimTimestamp || now,
                    },
                });
            }

            if (isWithdrawn && position.withdrawTxHash) {
                await prisma.transaction.upsert({
                    where: { txHash: position.withdrawTxHash },
                    update: {},
                    create: {
                        walletId: wallet.id,
                        chainId: sepolia.id,
                        stakePositionId: position.id,
                        type: TransactionType.WITHDRAW,
                        status: TransactionStatus.CONFIRMED,
                        amount: toTokenAmount(stakeAmount, 6),
                        txHash: position.withdrawTxHash,
                        blockNumber: BigInt(Math.floor(Math.random() * 1000000) + 6000000),
                        gasUsed: '100000',
                        gasPrice: '22000000000',
                        confirmedAt: unlockDate,
                    },
                });
            }
        }

        const userPositions = await prisma.stakePosition.findMany({
            where: { walletId: wallet.id },
        });

        const stats = {
            totalStaked: userPositions.reduce((sum, p) => sum + BigInt(p.principal), BigInt(0)),
            totalClaimed: userPositions.reduce((sum, p) => sum + BigInt(p.rewardClaimed), BigInt(0)),
            totalWithdrawn: userPositions.filter(p => p.isWithdrawn).reduce((sum, p) => sum + BigInt(p.principal), BigInt(0)),
            activeStakes: userPositions.filter(p => !p.isWithdrawn).length,
            completedStakes: userPositions.filter(p => p.isWithdrawn).length,
        };

        await prisma.userStatistics.upsert({
            where: { userId: user.id },
            update: {
                totalStaked: stats.totalStaked.toString(),
                totalClaimed: stats.totalClaimed.toString(),
                totalWithdrawn: stats.totalWithdrawn.toString(),
                activeStakes: stats.activeStakes,
                completedStakes: stats.completedStakes,
            },
            create: {
                userId: user.id,
                totalStaked: stats.totalStaked.toString(),
                totalClaimed: stats.totalClaimed.toString(),
                totalWithdrawn: stats.totalWithdrawn.toString(),
                activeStakes: stats.activeStakes,
                completedStakes: stats.completedStakes,
                pendingRewards: '0',
            },
        });
    }

    await prisma.blockchainSync.upsert({
        where: {
            chainId_contractAddress: {
                chainId: sepolia.id,
                contractAddress: contractAddress,
            },
        },
        update: { status: 'COMPLETED', lastSyncAt: now },
        create: {
            chainId: sepolia.id,
            contractAddress: contractAddress,
            lastProcessedBlock: BigInt(6500000),
            currentBlock: BigInt(6500100),
            status: 'COMPLETED',
            lastSyncAt: now,
        },
    });
    console.log('✅ Blockchain sync record created');

    const eventNames = ['Staked', 'Claimed', 'Withdrawn', 'PackageUpdated'];
    for (let i = 0; i < 20; i++) {
        const txHash = randomTxHash();
        await prisma.blockchainEvent.upsert({
            where: { txHash_logIndex: { txHash, logIndex: 0 } },
            update: {},
            create: {
                chainId: sepolia.id,
                eventName: eventNames[Math.floor(Math.random() * eventNames.length)],
                contractAddress: contractAddress,
                txHash,
                blockNumber: BigInt(6500000 - i * 100),
                logIndex: 0,
                eventData: { sample: true, index: i },
                processed: true,
                processedAt: new Date(now.getTime() - i * 3600000),
            },
        });
    }
    console.log('✅ 20 sample blockchain events created');

    const summary = await prisma.$transaction([
        prisma.user.count(),
        prisma.userWallet.count(),
        prisma.stakePosition.count(),
        prisma.transaction.count(),
    ]);

    console.log('\n🎉 Seed completed successfully!');
    console.log('━'.repeat(40));
    console.log(`   Users: ${summary[0]}`);
    console.log(`   Wallets: ${summary[1]}`);
    console.log(`   Stake Positions: ${summary[2]}`);
    console.log(`   Transactions: ${summary[3]}`);
    console.log('━'.repeat(40));
    console.log('\n📝 Test credentials:');
    console.log('   Admin: admin@yieldstaking.com / 123');
    console.log('   Users: alice@test.com, bob@test.com, etc. / 123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
