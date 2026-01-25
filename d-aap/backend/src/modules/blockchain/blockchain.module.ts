import { Module } from "@nestjs/common";

import { BlockchainEventListenerService } from "./blockchain-event-listener.service";
import { BlockchainEventProcessorService } from "./blockchain-event-processor.service";
import { BlockchainController } from "./blockchain.controller";
import { BlockchainService } from "./blockchain.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [BlockchainController],
    providers: [
        BlockchainService,
        BlockchainEventListenerService,
        BlockchainEventProcessorService,
    ],
    exports: [BlockchainService, BlockchainEventProcessorService],
})
export class BlockchainModule {}
