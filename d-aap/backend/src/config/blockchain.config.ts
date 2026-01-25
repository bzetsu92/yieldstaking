import { registerAs } from "@nestjs/config";

export default registerAs("blockchain", () => ({
    batchSize: parseInt(process.env.BLOCKCHAIN_BATCH_SIZE || "1000", 10),
    eventProcessingBatchSize: parseInt(
        process.env.EVENT_PROCESSING_BATCH_SIZE || "50",
        10,
    ),
    maxRetries: parseInt(process.env.BLOCKCHAIN_MAX_RETRIES || "3", 10),
    retryDelayMs: parseInt(process.env.BLOCKCHAIN_RETRY_DELAY_MS || "1000", 10),
    rpcRateLimit: parseInt(process.env.RPC_RATE_LIMIT || "10", 10),
    blockScanInterval: parseInt(process.env.BLOCK_SCAN_INTERVAL || "3000", 10),
    circuitBreakerThreshold: parseInt(
        process.env.CIRCUIT_BREAKER_THRESHOLD || "5",
        10,
    ),
    circuitBreakerTimeout: parseInt(
        process.env.CIRCUIT_BREAKER_TIMEOUT || "60000",
        10,
    ),
    autoProcessInterval: parseInt(
        process.env.AUTO_PROCESS_INTERVAL || "30000",
        10,
    ),
    maxConcurrentProcessing: parseInt(
        process.env.MAX_CONCURRENT_PROCESSING || "5",
        10,
    ),
    deploymentCacheTTL: parseInt(
        process.env.DEPLOYMENT_CACHE_TTL || "300000",
        10,
    ),
}));
