import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class LinkWalletDto {
    @ApiProperty({
        description: "Wallet address to link",
        example: "0x1234567890abcdef1234567890abcdef12345678",
    })
    @IsString()
    @Matches(/^0x[a-fA-F0-9]{40}$/, {
        message: "Invalid wallet address format",
    })
    walletAddress: string;

    @ApiProperty({
        description: "Signature of the message",
        example: "0x...",
    })
    @IsString()
    @Matches(/^0x[a-fA-F0-9]+$/, { message: "Invalid signature format" })
    signature: string;

    @ApiProperty({
        description: "Message that was signed",
        example: "Sign this message to link your wallet...",
    })
    @IsString()
    message: string;
}
