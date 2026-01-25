import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { JwtPayload } from "../interface/jwt-payload.interface";
import { UserPrincipal } from "../interface/user-principal.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        const jwtConfig = configService.get("jwt");
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConfig?.secretKey || "lottery-secret-key",
        });
    }

    async validate(payload: JwtPayload): Promise<UserPrincipal> {
        return {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            role: payload.role,
            walletAddress: payload.walletAddress,
        };
    }
}
