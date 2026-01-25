import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    NotFoundException,
} from "@nestjs/common";
import { Response } from "express";

import { NOT_FOUND } from "../constants/errors.constants";

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
    catch(exception: NotFoundException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const status = exception.getStatus?.() || HttpStatus.NOT_FOUND;

        const responseBody = exception.getResponse();
        let message = "Not Found";

        if (typeof responseBody === "string") {
            message = responseBody;
        } else if (
            typeof responseBody === "object" &&
            responseBody !== null &&
            "message" in responseBody
        ) {
            const msg = (responseBody as { message?: string | string[] })
                .message;
            message = Array.isArray(msg) ? msg.join(", ") : msg || "Not Found";
        }

        const exceptionResponse = {
            success: false,
            error: {
                code: parseInt(NOT_FOUND.split(":")[0], 10),
                message,
                details: null,
            },
        };

        return response.status(status).json(exceptionResponse);
    }
}
