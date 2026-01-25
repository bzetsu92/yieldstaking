import { type Provider } from "@nestjs/common";

import { prefixesForLoggers } from "./logger.decorator";
import { LoggerService } from "./logger.service";

function loggerFactory(logger: LoggerService, prefix: string): LoggerService {
    const wrapper = Object.create(logger) as LoggerService;

    wrapper.log = (msg: string) => logger.log(`[${prefix}] ${msg}`);
    wrapper.error = (msg: string, trace?: unknown) => {
        logger.error(`[${prefix}] ${msg}`, trace);
    };
    wrapper.warn = (msg: string) => logger.warn(`[${prefix}] ${msg}`);
    wrapper.logRequest = logger.logRequest.bind(logger);
    wrapper.logResponse = logger.logResponse.bind(logger);
    wrapper.setPrefix = () => {
        // No-op: prefix is handled in wrapper
    };

    return wrapper;
}

function createLoggerProvider(prefix: string): Provider<LoggerService> {
    return {
        provide: `LoggerService${prefix}`,
        useFactory: (logger: LoggerService) => loggerFactory(logger, prefix),
        inject: [LoggerService],
    };
}

export function createLoggerProviders(): Array<Provider<LoggerService>> {
    return prefixesForLoggers.map((prefix) => createLoggerProvider(prefix));
}
