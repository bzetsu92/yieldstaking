import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(PrismaService.name);
    private readonly pool: Pool;

    constructor(config: ConfigService) {
        const connectionString = config.get<string>("DATABASE_URL");
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);

        super({ adapter });

        this.pool = pool;
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log("Prisma connected");
    }

    async onModuleDestroy() {
        await this.$disconnect();
        await this.pool.end();
        this.logger.log("Prisma disconnected");
    }
}
