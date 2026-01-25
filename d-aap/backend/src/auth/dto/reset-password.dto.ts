import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MinLength } from "class-validator";

import { ERR_MESSAGES } from "@/constants/messages.constant";

export class RequestResetPasswordDto {
    @ApiProperty({ type: "string", example: "user@example.com" })
    @MinLength(1, { message: ERR_MESSAGES.USER.EMAIL_INVALID })
    @IsEmail({}, { message: ERR_MESSAGES.USER.EMAIL_INVALID })
    @IsString()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({
        type: "string",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    })
    @MinLength(1, { message: ERR_MESSAGES.PASSWORD_RESET.TOKEN_REQUIRED })
    @IsString()
    token: string;

    @ApiProperty({ required: true })
    @MinLength(1, {
        message: ERR_MESSAGES.PASSWORD_RESET.NEW_PASSWORD_REQUIRED,
    })
    @Matches(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/]).{8,}$/,
        {
            message: ERR_MESSAGES.PASSWORD_RESET.NEW_PASSWORD_INVALID,
        },
    )
    newPassword: string;
}
