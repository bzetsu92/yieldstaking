import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.25",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
        hardhat: {
            chainId: 31337,
            allowBlocksWithSameTimestamp: true,
        },
        sepolia: {
            url: "https://sepolia.infura.io/v3/d6b88b54f02148b5b7e56c0c85364a3d",
            chainId: 11155111,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
        mainnet: {
            url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
            chainId: 1,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        }
    },
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY || "",
            mainnet: process.env.ETHERSCAN_API_KEY || ""
        }
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    typechain: {
        outDir: "typechain-types",
        target: "ethers-v6",
    }
};

export default config;

