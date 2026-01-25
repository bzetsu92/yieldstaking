import {
    Injectable,
    ExecutionContext,
    UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

import { TOKEN_EXPIRED, TOKEN_INVALID } from "@/constants/errors.constants";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> {
        return super.canActivate(context) as boolean;
    }

    handleRequest<TUser = any>(err: unknown, user: unknown, info: any): TUser {
        if (info) {
            switch (info.name) {
                case "TokenExpiredError":
                    throw new UnauthorizedException(TOKEN_EXPIRED);

                case "JsonWebTokenError":
                    throw new UnauthorizedException(TOKEN_INVALID);
            }
        }
        const msg =
            err &&
            typeof err === "object" &&
            "message" in err &&
            typeof (err as any).message === "string"
                ? (err as any).message
                : "Authentication error";

        if (err || !user) {
            throw err || new UnauthorizedException(msg);
        }
        return user as TUser;
    }
}
