import { registerAs } from "@nestjs/config";

export default registerAs("jwt", () => ({
    secretKey: process.env.JWT_SECRET || "lottery-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
}));
