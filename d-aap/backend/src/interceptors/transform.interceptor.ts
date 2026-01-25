import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
    data: T;
}

function convertSpecialTypesToString(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === "bigint") {
        return obj.toString();
    }

    if (obj instanceof Date) {
        return obj.toISOString();
    }

    if (Array.isArray(obj)) {
        return obj.map(convertSpecialTypesToString);
    }

    if (typeof obj === "object") {
        const converted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertSpecialTypesToString(value);
        }
        return converted;
    }

    return obj;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        return next.handle().pipe(
            map((value: unknown) => {
                const convertedValue = convertSpecialTypesToString(value);

                if (convertedValue === undefined || convertedValue === null) {
                    return {
                        success: true,
                        data: null as T,
                    };
                }

                if (
                    typeof convertedValue === "object" &&
                    convertedValue !== null &&
                    "data" in convertedValue
                ) {
                    return {
                        success: true,
                        ...(convertedValue as Record<string, unknown>),
                        data: (convertedValue as { data: T }).data,
                    };
                }

                return {
                    success: true,
                    data: convertedValue as T,
                };
            }),
        );
    }
}
