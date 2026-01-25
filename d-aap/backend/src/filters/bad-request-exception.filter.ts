/* eslint-disable */
import {
    ArgumentsHost,
    BadRequestException,
    Catch,
    HttpStatus,
    HttpException,
} from "@nestjs/common";
import { Response } from "express";
import { ValidationError } from "class-validator";
import { BAD_REQUEST } from "../constants/errors.constants";
import BaseExceptionFilter from "./base-exception.filter";

@Catch(BadRequestException)
export class BadRequestExceptionFilter extends BaseExceptionFilter {
    constructor() {
        super(BAD_REQUEST, HttpStatus.BAD_REQUEST);
    }

    catch(exception: BadRequestException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const res = exception.getResponse();
        const status = exception.getStatus();

        let details: Record<string, string> | null = null;
        let message = "Bad Request";

        if (typeof res === "object" && (res as any).details) {
            details = (res as any).details;
            message = (res as any).message || "Validation failed";
        } else if (
            typeof res === "object" &&
            Array.isArray((res as any).message) &&
            (res as any).message.every((m) => m instanceof ValidationError)
        ) {
            const validationErrors = (res as any).message as ValidationError[];
            details = {};
            validationErrors.forEach((err) => {
                const field = err.property;
                const constraints = Object.values(err.constraints || {});
                if (constraints.length > 0) {
                    details[field] = constraints.join(", ");
                }
            });
            message = "Validation failed";
        } else if (
            typeof res === "object" &&
            Array.isArray((res as any).message) &&
            (res as any).message.every((m) => typeof m === "string")
        ) {
            const rawMessages = (res as any).message as string[];
            details = {};
            rawMessages.forEach((err) => {
                const [field, ...rest] = err.split(":");
                const msg = rest.join(":").trim();
                if (field && msg) {
                    details[field.trim()] = msg;
                }
            });
            message = "Validation failed";
        }

        response.status(status).json({
            success: false,
            error: {
                code: status,
                message,
                details,
            },
        });
    }
}
