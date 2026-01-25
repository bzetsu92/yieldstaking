import { type UserRole } from "../../enums";

export interface UserPrincipal {
    id: number;
    email?: string;
    name: string;
    role: UserRole;
    walletAddress?: string;
}
