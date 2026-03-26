import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });
dotenv.config({ path: join(__dirname, "../../d-aap/backend/.env") });

const STAKING_ABI = [
    "function stakeToken() view returns (address)",
    "function rewardToken() view returns (address)",
    "function totalLocked() view returns (uint256)",
    "function totalRewardDebt() view returns (uint256)",
    "function minStakeAmount() view returns (uint256)",
    "function paused() view returns (bool)",
    "function packages(uint8) view returns (uint64 lockPeriod, uint32 apy, bool enabled)",
];

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
];

/** Matches YieldStaking._computeRewardTotal (raw APY then scale to reward decimals). */
function computeRewardTotal(amount, apy, lockPeriod, stakeDecimals, rewardDecimals) {
    const denom = 31536000n * 10000n;
    const raw = (amount * apy * lockPeriod) / denom;
    const scaleR = 10n ** BigInt(rewardDecimals);
    const scaleS = 10n ** BigInt(stakeDecimals);
    return (raw * scaleR) / scaleS;
}

const SEPOLIA_CHAIN_ID = 11155111;

const DEFAULT_RPC_CANDIDATES = [
    process.env.CHECK_STAKING_RPC_URL?.trim(),
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://rpc2.sepolia.org",
    "https://rpc.sepolia.org",
].filter(Boolean);

async function createProvider() {
    let lastErr;
    for (const rpc of DEFAULT_RPC_CANDIDATES) {
        try {
            const provider = new ethers.JsonRpcProvider(rpc, SEPOLIA_CHAIN_ID, {
                batchMaxCount: 1,
            });
            await provider.getBlockNumber();
            return { provider, rpc };
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr ?? new Error("No working Sepolia RPC");
}

async function main() {
    const stakingAddr = process.env.YIELD_STAKING_ADDRESS?.trim();
    const expectedUsdt = process.env.USDT_ADDRESS?.trim()?.toLowerCase();
    const expectedAur = process.env.AUREUS_ADDRESS?.trim()?.toLowerCase();

    if (!stakingAddr || !ethers.isAddress(stakingAddr)) {
        throw new Error("Set YIELD_STAKING_ADDRESS (e.g. in d-aap/backend/.env)");
    }

    const { provider, rpc } = await createProvider();
    const staking = new ethers.Contract(stakingAddr, STAKING_ABI, provider);

    const onChainStake = await staking.stakeToken();
    const onChainReward = await staking.rewardToken();
    const totalLocked = await staking.totalLocked();
    const totalRewardDebt = await staking.totalRewardDebt();
    const minStake = await staking.minStakeAmount();
    const isPaused = await staking.paused();
    const pkg0 = await staking.packages(0);

    const stakeLower = String(onChainStake).toLowerCase();
    const rewardLower = String(onChainReward).toLowerCase();

    const stakeToken = new ethers.Contract(onChainStake, ERC20_ABI, provider);
    const usdt = new ethers.Contract(onChainReward, ERC20_ABI, provider);
    const stakeDecimals = await stakeToken.decimals();
    const rewardDecimals = await usdt.decimals();
    const stakeSymbol = await stakeToken.symbol();
    const rewardSymbol = await usdt.symbol();
    const rewardBal = await usdt.balanceOf(stakingAddr);
    const sd = Number(stakeDecimals);
    const rd = Number(rewardDecimals);

    const lockPeriod = pkg0.lockPeriod;
    const apy = BigInt(pkg0.apy);
    const enabled = pkg0.enabled;
    const sampleRewardRaw = computeRewardTotal(minStake, apy, lockPeriod, sd, rd);
    const neededForMinStake = totalRewardDebt + sampleRewardRaw;

    const principalFloat = Number(minStake) / 10 ** Number(stakeDecimals);
    const lockYears = Number(lockPeriod) / 31536000;
    const apyFraction = Number(apy) / 10000;
    const economicRewardUsdt = principalFloat * apyFraction * lockYears;

    console.log("\n=== YieldStaking liquidity check (Sepolia) ===\n");
    console.log("RPC:", rpc.length > 52 ? rpc.slice(0, 52) + "…" : rpc);
    console.log("YieldStaking:", stakingAddr);
    console.log("On-chain stakeToken :", onChainStake);
    console.log("On-chain rewardToken:", onChainReward);
    if (expectedAur && stakeLower !== expectedAur) {
        console.log("⚠️  AUREUS_ADDRESS in .env does not match contract stakeToken");
    }
    if (expectedUsdt && rewardLower !== expectedUsdt) {
        console.log("⚠️  USDT_ADDRESS in .env does not match contract rewardToken");
    }

    console.log("\n--- State ---");
    console.log("paused           :", isPaused);
    console.log("totalLocked      :", ethers.formatUnits(totalLocked, stakeDecimals), stakeSymbol);
    console.log("minStakeAmount   :", ethers.formatUnits(minStake, stakeDecimals), stakeSymbol);
    console.log(
        "totalRewardDebt  : raw",
        totalRewardDebt.toString(),
        `(${ethers.formatUnits(totalRewardDebt, rewardDecimals)} ${rewardSymbol} if interpreted as ${rewardDecimals} decimals)`,
    );

    if (sd !== rd) {
        console.log(
            "\n⚠️  Stake token decimals (",
            sd,
            ") ≠ reward token decimals (",
            rd,
            "). Solidity uses one formula for rewardTotal; the contract compares that uint to USDT balanceOf without scaling — raw requirements below can be huge unless tokens share decimals.",
        );
    }

    console.log("\n--- Reward token in contract ---");
    console.log("rewardBal (raw wei):", rewardBal.toString());
    console.log(
        "rewardBal (human) :",
        ethers.formatUnits(rewardBal, rewardDecimals),
        rewardSymbol,
    );

    const okDebt = rewardBal >= totalRewardDebt;
    console.log("\n--- Rule (same as contract) ---");
    console.log("require: rewardToken.balance(staking) >= totalRewardDebt + rewardTotal(next stake)");
    console.log("(all compared as raw uint256, same as on-chain)");
    console.log("rewardBal >= totalRewardDebt ?", okDebt ? "YES" : "NO");

    if (!okDebt) {
        const short = totalRewardDebt - rewardBal;
        console.log("\n❌ Missing raw wei:", short.toString());
    }

    console.log("\n--- Package 0 + min stake (example) ---");
    console.log("enabled    :", enabled);
    console.log("lockPeriod :", lockPeriod.toString(), "s");
    console.log("apy (bps)  :", apy.toString());
    console.log("rewardTotal raw (Solidity formula):", sampleRewardRaw.toString());
    console.log(
        "~Economic reward (USDT tokens, APY×time, for humans only):",
        economicRewardUsdt.toFixed(6),
        rewardSymbol,
    );

    console.log(
        "\nUSDT needed (raw sum totalRewardDebt + rewardTotal):",
        neededForMinStake.toString(),
    );

    const canMinStake = rewardBal >= neededForMinStake;
    console.log(
        "\nCan min-sized stake on pkg 0 succeed (raw compare)?",
        canMinStake ? "YES" : "NO — mint/transfer more reward token to staking contract",
    );

    if (!canMinStake && !isPaused && enabled) {
        const need = neededForMinStake > rewardBal ? neededForMinStake - rewardBal : 0n;
        console.log("→ Need more raw wei:", need.toString());
        console.log(
            "  (= human",
            ethers.formatUnits(need, rewardDecimals),
            rewardSymbol,
            "if balance uses",
            rd,
            "decimals)",
        );
    }

    console.log("\n=== Done ===\n");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
