import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

import { AuthService } from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        const googleOAuthConfig = configService.get("googleOAuth");
        super({
            clientID: googleOAuthConfig?.clientId || "",
            clientSecret: googleOAuthConfig?.clientSecret || "",
            callbackURL:
                googleOAuthConfig?.callbackURL ||
                "http://localhost:3000/api/v1/auth/google/callback",
            scope: googleOAuthConfig?.scope || ["email", "profile"],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { id, name, emails, photos } = profile;
        const user = {
            googleId: id,
            email: emails[0].value,
            name: name.givenName + " " + name.familyName,
            avatar: photos[0].value,
            accessToken,
            refreshToken,
        };
        done(null, user);
    }
}
