import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "../app.module";

const logger = new Logger("BlockchainListenerWorker");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function bootstrap() {
    await NestFactory.createApplicationContext(AppModule, {
        logger: ["error", "warn", "log"],
    });

    logger.log("Listener worker started");

    while (true) {
        await sleep(60_000);
    }
}

void bootstrap();

