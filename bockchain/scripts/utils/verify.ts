import { run } from "hardhat";

export async function verifyContract(address: string, args: any[]) {
    console.log("Verifying contract... ", address);
    try {
        await run("verify:verify", {
            address: address,
            constructorArguments: args,
        });
    } catch (e) {
        console.log("Verification failed:", e);
    }
}
