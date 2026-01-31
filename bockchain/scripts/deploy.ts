import { network } from "hardhat";
const { ethers } = await network.connect();
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const requiredEnvVars = [
        "TN_ADMIN_ADDRESS",
        "TN_OPERATOR_ADDRESS",
    ] as const;

    const env = {} as Record<(typeof requiredEnvVars)[number], string>;

    for (const varName of requiredEnvVars) {
        const value = process.env[varName];
        if (!value) {
            throw new Error(`Missing ${varName} in .env`);
        }
        env[varName] = value;
    }

    const [deployer] = await ethers.getSigners();
    console.log("🚀 Deploying to Sepolia with:", deployer.address);

    // ---------------- MockUSDT ----------------
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy(env.TN_ADMIN_ADDRESS);
    await usdt.waitForDeployment();

    // ---------------- Aureus ----------------
    const Aureus = await ethers.getContractFactory("Aureus");
    const aureus = await Aureus.deploy(env.TN_ADMIN_ADDRESS);
    await aureus.waitForDeployment();

    // ---------------- YieldStaking ----------------
    const YieldStaking = await ethers.getContractFactory("YieldStaking");
    const staking = await YieldStaking.deploy(
        env.TN_ADMIN_ADDRESS,
        env.TN_OPERATOR_ADDRESS,
        await aureus.getAddress(),
        await usdt.getAddress()
    );
    await staking.waitForDeployment();

    console.log("\n=== Deployment Summary (Sepolia) ===");
    console.log("MockUSDT:", await usdt.getAddress());
    console.log("Aureus:", await aureus.getAddress());
    console.log("YieldStaking:", await staking.getAddress());

    // ---------------- Verify ----------------

    console.log("\nAdmin:", env.TN_ADMIN_ADDRESS);
    console.log("Operator:", env.TN_OPERATOR_ADDRESS);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
