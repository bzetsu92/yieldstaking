import {
    BadRequestException,
    RequestMethod,
    ValidationPipe,
    VersioningType,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import {
    DocumentBuilder,
    type OpenAPIObject,
    SwaggerModule,
} from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { AccessExceptionFilter } from "./filters/access-exception.filter";
import { AllExceptionsFilter } from "./filters/all-exception.filter";
import { BadRequestExceptionFilter } from "./filters/bad-request-exception.filter";
import { NotFoundExceptionFilter } from "./filters/not-found-exception.filter";
import { TransformInterceptor } from "./interceptors/transform.interceptor";

const basicAuth = require("express-basic-auth");

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            exceptionFactory: (errors) => {
                const messages = errors.map((error) => {
                    const constraints = Object.values(error.constraints || {});
                    return `${error.property}: ${constraints.join(", ")}`;
                });
                return new BadRequestException({
                    message: "Validation failed",
                    errors: messages,
                    details: errors.reduce(
                        (acc, error) => {
                            const constraints = Object.values(
                                error.constraints || {},
                            );
                            if (constraints.length > 0) {
                                acc[error.property] = constraints.join(", ");
                            }
                            return acc;
                        },
                        {} as Record<string, string>,
                    ),
                });
            },
        }),
    );

    const corsOptions = configService.get("cors");
    app.enableCors(
        corsOptions || {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
        },
    );

    app.setGlobalPrefix("api", {
        exclude: [
            { path: "/", method: RequestMethod.GET },
            { path: "/health", method: RequestMethod.GET },
        ],
    });

    app.getHttpAdapter().get("/health", (req: any, res: any) => {
        res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
        });
    });

    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: "1",
    });

    if (process.env.NODE_ENV !== "production") {
        const swaggerUser = process.env.SWAGGER_USER || "admin";
        const swaggerPassword = process.env.SWAGGER_PASSWORD || "admin";

        app.use(
            ["/docs"],
            basicAuth({
                challenge: true,
                users: {
                    [swaggerUser]: swaggerPassword,
                },
            }),
        );

        const options: Omit<OpenAPIObject, "paths"> = new DocumentBuilder()
            .setTitle("Yield Staking Platform API")
            .setDescription(
                "Complete API documentation for the Yield Staking Platform. This platform allows users to stake tokens, earn rewards, and manage their staking positions.",
            )
            .setVersion("1.0")
            .addServer("http://localhost:3000", "Development server")
            .addBearerAuth(
                {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    in: "header",
                    name: "Authorization",
                    description: "Enter JWT token",
                },
                "access-token",
            )
            .addTag("Auth", "Authentication endpoints")
            .addTag("Users", "User management endpoints")
            .addTag("Staking", "Staking operations endpoints")
            .addTag("Transactions", "Transaction history endpoints")
            .addTag("Blockchain", "Blockchain sync and events endpoints")
            .addTag(
                "Admin",
                "Admin-only management endpoints (requires ADMIN role)",
            )
            .build();

        const document: OpenAPIObject = SwaggerModule.createDocument(
            app,
            options,
            {
                extraModels: [],
            },
        );

        SwaggerModule.setup("docs", app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        });
    }

    app.useGlobalInterceptors(new TransformInterceptor());

    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(
        new AllExceptionsFilter(),
        new AccessExceptionFilter(httpAdapter),
        new NotFoundExceptionFilter(),
        new BadRequestExceptionFilter(),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`Yield Staking Backend running on: http://localhost:${port}`);
    console.log(`Swagger docs available at: http://localhost:${port}/docs`);

    process.on("SIGTERM", async () => {
        await app.close();
    });
}

void bootstrap();
