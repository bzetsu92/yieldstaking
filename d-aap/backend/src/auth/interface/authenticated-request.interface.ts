import { type UserPrincipal } from "./user-principal.interface";

export interface AuthenticatedRequest {
    user: UserPrincipal;
}
