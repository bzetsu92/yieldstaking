import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const result = (await super.canActivate(context)) as boolean;
        const request = context.switchToHttp().getRequest();
        await super.logIn(request);
        return result;
    }

    handleRequest<TUser = any>(err: unknown, user: unknown): TUser {
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
