import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { LoggerMiddleware } from "@/middleware/logger.middleware";

import { AuthModule } from "./auth/auth.module";
import blockchainConfig from "./config/blockchain.config";
import corsConfig from "./config/cors.config";
import googleOAuthConfig from "./config/google-oauth.config";
import jwtConfig from "./config/jwt.config";
import { LoggerModule } from "./logger/logger.module";
import { AdminModule } from "./modules/admin/admin.module";
import { BlockchainModule } from "./modules/blockchain/blockchain.module";
import { StakingModule } from "./modules/staking/staking.module";
import { TransactionModule } from "./modules/transaction/transaction.module";
import { UserModule } from "./modules/user/user.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [corsConfig, jwtConfig, googleOAuthConfig, blockchainConfig],
        }),
        LoggerModule.forRoot(),
        PrismaModule,
        AuthModule,
        UserModule,
        StakingModule,
        TransactionModule,
        BlockchainModule,
        AdminModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes("*");
    }
}
