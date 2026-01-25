import * as fs from "fs";
import * as path from "path";

import { Injectable, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as winston from "winston";

@Injectable({
    scope: Scope.DEFAULT,
})
export class LoggerService {
    private prefix?: string;
    private logger: winston.Logger;
    private readonly isProduction: boolean;
    private readonly enableFileLogging: boolean;
    private readonly logDir: string;
    private readonly fileFormat: winston.Logform.Format;

    constructor(private configService: ConfigService) {
        this.isProduction = this.configService.get("NODE_ENV") === "production";
        this.enableFileLogging =
            this.configService.get("ENABLE_FILE_LOGGING", "false") === "true";

        this.logDir = this.configService.get(
            "LOG_DIR",
            this.isProduction
                ? "/var/log/app"
                : path.resolve(process.cwd(), "logs"),
        );

        const addPrefixFormat = winston.format((info) => {
            if (this.prefix) {
                info.service = this.prefix;
            }
            return info;
        });

        const productionFormat = winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            addPrefixFormat(),
            winston.format.json(),
        );

        const toSafeString = (value: unknown): string => {
            if (typeof value === "string") {
                return value;
            }

            if (typeof value === "number" || typeof value === "boolean") {
                return String(value);
            }

            if (value instanceof Date) {
                return value.toISOString();
            }

            if (value === null || value === undefined) {
                return "";
            }

            try {
                return JSON.stringify(value);
            } catch {
                return "[Unserializable]";
            }
        };

        const devConsoleFormat = winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message }) => {
                const safeTimestamp = toSafeString(timestamp);
                const safeMessage = toSafeString(message);

                return `${safeTimestamp} [${level}]${this.prefix ? " [" + this.prefix + "]" : ""} ${safeMessage}`;
            }),
        );

        this.fileFormat = this.isProduction
            ? productionFormat
            : winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.errors({ stack: true }),
                  addPrefixFormat(),
                  winston.format.json(),
              );

        this.logger = winston.createLogger({
            level: this.isProduction ? "warn" : "info",
            transports: [
                new winston.transports.Console({
                    format: this.isProduction
                        ? productionFormat
                        : devConsoleFormat,
                }),
            ],
        });

        if (this.enableFileLogging && !this.isProduction) {
            void this.initializeFileLogging();
        }
    }

    private async initializeFileLogging(): Promise<void> {
        try {
            await fs.promises.mkdir(this.logDir, { recursive: true });

            this.logger.add(
                new winston.transports.File({
                    filename: path.join(this.logDir, "app.log"),
                    maxsize: 5 * 1024 * 1024,
                    maxFiles: 5,
                    tailable: true,
                    format: this.fileFormat,
                }),
            );
        } catch {
            this.logger.warn("Failed to initialize file logging");
        }
    }

    log(message: string, metadata?: Record<string, unknown>): void {
        if (metadata) {
            this.logger.info(message, metadata);
        } else {
            this.logger.info(message);
        }
    }

    error(
        message: string,
        trace?: unknown,
        metadata?: Record<string, unknown>,
    ): void {
        const logData: Record<string, unknown> = {
            ...metadata,
        };

        if (trace) {
            if (trace instanceof Error) {
                logData.error = {
                    message: trace.message,
                    stack: trace.stack,
                    name: trace.name,
                };
            } else if (typeof trace === "string") {
                logData.error = trace;
            } else {
                logData.error = trace;
            }
        }

        this.logger.error(message, logData);
    }

    warn(message: string, metadata?: Record<string, unknown>): void {
        if (metadata) {
            this.logger.warn(message, metadata);
        } else {
            this.logger.warn(message);
        }
    }

    logRequest(
        method: string,
        url: string,
        ip: string,
        userAgent?: string,
        body?: unknown,
        requestId?: string,
    ): void {
        const metadata: Record<string, unknown> = {
            method,
            url,
            ip,
            userAgent: userAgent ? userAgent.substring(0, 100) : undefined,
        };

        if (requestId) {
            metadata.requestId = requestId;
        }

        if (this.isProduction) {
            this.logger.info("HTTP Request", metadata);
            return;
        }

        const safeBody = this.maskSensitiveData(body);
        if (safeBody) {
            try {
                const bodyJson = JSON.stringify(safeBody);
                metadata.body =
                    bodyJson.length > 500
                        ? bodyJson.substring(0, 500) + "..."
                        : bodyJson;
            } catch {
                metadata.body = "[Unable to stringify]";
            }
        }

        this.logger.info("HTTP Request", metadata);
    }

    logResponse(
        method: string,
        url: string,
        ip: string,
        statusCode: number,
        responseTime: number,
        requestId?: string,
    ): void {
        if (this.isProduction && responseTime < 1000) {
            return;
        }

        const metadata: Record<string, unknown> = {
            method,
            url,
            ip,
            statusCode,
            responseTime,
        };

        if (requestId) {
            metadata.requestId = requestId;
        }

        if (statusCode >= 500) {
            this.logger.error("HTTP Response", metadata);
        } else if (statusCode >= 400) {
            this.logger.warn("HTTP Response", metadata);
        } else {
            this.logger.info("HTTP Response", metadata);
        }
    }

    setPrefix(prefix: string): void {
        this.prefix = prefix;
    }

    private maskSensitiveData(data: unknown): unknown {
        if (!data || typeof data !== "object") {
            return data;
        }

        if (Array.isArray(data)) {
            return data.map((item) => this.maskSensitiveData(item));
        }

        const sensitiveKeys = [
            "password",
            "token",
            "accessToken",
            "refreshToken",
            "apiKey",
            "secret",
            "authorization",
            "ssn",
            "creditCard",
            "cardNumber",
        ];

        const masked: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            const isSensitive = sensitiveKeys.some((sk) =>
                lowerKey.includes(sk),
            );

            if (isSensitive) {
                masked[key] = "***MASKED***";
            } else if (typeof value === "object" && value !== null) {
                masked[key] = this.maskSensitiveData(value);
            } else {
                masked[key] = value;
            }
        }

        return masked;
    }
}
