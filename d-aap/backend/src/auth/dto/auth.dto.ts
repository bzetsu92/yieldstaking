import {
    IsEthereumAddress,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from "class-validator";

export class RequestPasswordResetDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class RefreshTokenDto {
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class MetaMaskNonceDto {
    @IsOptional()
    @IsEthereumAddress()
    walletAddress?: string;
}

export class MetaMaskSignInDto {
    @IsNotEmpty()
    @IsEthereumAddress()
    walletAddress: string;

    @IsString()
    @IsNotEmpty()
    signature: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}

export class EmailRegisterDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
