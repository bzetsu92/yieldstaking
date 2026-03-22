import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "../app.module";
import { BlockchainEventProcessorService } from "../modules/blockchain/blockchain-event-processor.service";

const logger = new Logger("BlockchainEventsWorker");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function bootstrap() {
    // This worker should only process DB events; do not run the listener/scanner here.
    process.env.BLOCKCHAIN_LISTENER_ENABLED ??= "false";
    process.env.BLOCKCHAIN_AUTO_PROCESS_EVENTS ??= "false";
    // Also disable background auth cleanups that rely on long-lived HTTP server lifecycle.
    process.env.METAMASK_NONCE_CLEANUP_ENABLED ??= "false";

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ["error", "warn", "log"],
    });

    const processor = app.get(BlockchainEventProcessorService);

    const batchSize = parseInt(process.env.BLOCKCHAIN_WORKER_BATCH || "50", 10);
    const idleMs = parseInt(process.env.BLOCKCHAIN_WORKER_IDLE_MS || "1000", 10);

    logger.log(`Worker started batch=${batchSize} idleMs=${idleMs}`);

    while (true) {
        try {
            const result = await processor.processUnprocessedEvents(batchSize);
            const processed = result.processed || 0;
            const failed = result.failed || 0;

            if (processed === 0 && failed === 0) {
                await sleep(idleMs);
            }
        } catch (error) {
            logger.error(
                `Worker loop error: ${error instanceof Error ? error.message : String(error)}`,
            );
            await sleep(Math.min(idleMs * 5, 10_000));
        }
    }
}

void bootstrap();
