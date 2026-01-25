import { type UserRole } from "@/enums";

export interface JwtPayload {
    readonly id: number;
    readonly email?: string;
    readonly name: string;
    readonly role: UserRole;
    readonly walletAddress?: string;
}
