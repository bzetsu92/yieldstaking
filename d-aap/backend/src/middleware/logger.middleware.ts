import { randomUUID } from "crypto";

import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

import { LoggerService } from "@/logger/logger.service";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    constructor(private readonly logger: LoggerService) {}

    use(req: Request, res: Response, next: NextFunction) {
        if (this.shouldSkip(req)) {
            return next();
        }

        const startTime = Date.now();
        const ip = this.getClientIP(req);
        const ua = req.get("user-agent") || req.get("User-Agent") || "Unknown";

        const requestId =
            req.get("x-request-id") ||
            req.get("x-correlation-id") ||
            randomUUID();

        res.setHeader("x-request-id", requestId);

        this.logger.logRequest(
            req.method,
            req.originalUrl,
            ip,
            ua,
            req.body,
            requestId,
        );

        let responded = false;
        const logResponse = () => {
            if (responded) return;
            responded = true;
            const ms = Date.now() - startTime;
            this.logger.logResponse(
                req.method,
                req.originalUrl,
                ip,
                res.statusCode,
                ms,
                requestId,
            );
        };

        res.once("finish", logResponse);
        res.once("close", logResponse);
        res.once("error", logResponse);

        next();
    }

    private shouldSkip(req: Request): boolean {
        const url = req.originalUrl.toLowerCase();
        return (
            url === "/" ||
            url.includes("/health") ||
            url.includes("/metrics") ||
            url.includes("/docs")
        );
    }

    private getClientIP(req: Request): string {
        const forwardedFor = req.headers["x-forwarded-for"];
        const realIP = req.headers["x-real-ip"];
        const cfConnectingIP = req.headers["cf-connecting-ip"];

        if (cfConnectingIP) {
            return Array.isArray(cfConnectingIP)
                ? cfConnectingIP[0]
                : cfConnectingIP;
        }

        if (realIP) {
            return Array.isArray(realIP) ? realIP[0] : realIP;
        }

        if (forwardedFor) {
            const forwarded = Array.isArray(forwardedFor)
                ? forwardedFor[0]
                : forwardedFor;
            return forwarded.split(",")[0]?.trim() || forwarded;
        }

        return req.ip || req.socket.remoteAddress || "Unknown";
    }
}
