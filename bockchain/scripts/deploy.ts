import { ethers } from "hardhat";
import { verifyContract } from "./utils/verify";

async function main() {
    const requiredEnvVars = [
        "TN_ADMIN_ADDRESS",
        "TN_OPERATOR_ADDRESS"
    ] as const;
    
    const env = {} as Record<typeof requiredEnvVars[number], string>;
    
    requiredEnvVars.forEach(varName => {
        const value = process.env[varName];
        if (!value) {
            throw new Error(`Missing ${varName} in .env`);
        }
        env[varName] = value;
    });

    const [deployer] = await ethers.getSigners();
    console.log("Testnet deployment with:", deployer.address);

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy(env.TN_ADMIN_ADDRESS);
    await usdt.waitForDeployment();

    const Aureus = await ethers.getContractFactory("Aureus");
    const aureus = await Aureus.deploy(env.TN_ADMIN_ADDRESS);
    await aureus.waitForDeployment();

    const YieldStaking = await ethers.getContractFactory("YieldStaking");
    const staking = await YieldStaking.deploy(
        env.TN_ADMIN_ADDRESS,
        env.TN_OPERATOR_ADDRESS,
        await aureus.getAddress(),
        await usdt.getAddress()
    );
    await staking.waitForDeployment();

    console.log("\n=== Deployment Summary ===");
    console.log(`MockUSDT: ${await usdt.getAddress()}`);
    console.log(`Aureus Token: ${await aureus.getAddress()}`);
    console.log(`YieldStaking: ${await staking.getAddress()}`);

    await delay(1 * 60 * 1000);

    console.log("Verifying contracts...");
    try {
        await verifyContract(await usdt.getAddress(), [env.TN_ADMIN_ADDRESS]);
        await verifyContract(await aureus.getAddress(), [env.TN_ADMIN_ADDRESS]);
        await verifyContract(await staking.getAddress(), [
            env.TN_ADMIN_ADDRESS,
            env.TN_OPERATOR_ADDRESS,
            await aureus.getAddress(),
            await usdt.getAddress()
        ]);

        console.log("All contracts verified successfully.");
    } catch (error) {
        console.error("Verification failed:", error);
    }

    console.log("\nTestnet Deployment Info:");
    console.log("------------------------");
    console.log("MockUSDT:", await usdt.getAddress());
    console.log("Aureus:", await aureus.getAddress());
    console.log("YieldStaking:", await staking.getAddress());
    console.log("Admin:", env.TN_ADMIN_ADDRESS);
    console.log("Operator:", env.TN_OPERATOR_ADDRESS);
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});