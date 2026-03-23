import { Module } from "@nestjs/common";

import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { BlockchainModule } from "../blockchain/blockchain.module";

@Module({
    imports: [PrismaModule, BlockchainModule],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule {}
