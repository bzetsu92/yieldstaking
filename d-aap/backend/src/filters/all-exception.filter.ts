/* eslint-disable */
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { INTERNAL_SERVER_ERROR } from "../constants/errors.constants";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();

        const status: number = exception.getStatus
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorMessage =
            exception?.response?.message ||
            exception?.message ||
            INTERNAL_SERVER_ERROR;

        const parts = errorMessage.split(":");
        let code: number;
        let message: string;

        if (parts.length >= 2) {
            const parsedCode = parseInt(parts[0], 10);
            if (!isNaN(parsedCode)) {
                code = parsedCode;
                message = parts.slice(1).join(":").trim();
            } else {
                code = status;
                message = errorMessage.trim();
            }
        } else {
            code = status;
            message = errorMessage.trim() || "Internal Server Error";
        }

        const exceptionResponse = {
            success: false,
            error: {
                code,
                message,
                details: exception?.response?.error || null,
            },
        };

        Logger.error(exception, "AllExceptionsFilter");
        Logger.error(exception.stack, "AllExceptionsFilter");

        return res.status(status).json(exceptionResponse);
    }
}
