import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MaxLength, IsUrl } from "class-validator";

export class UpdateProfileDto {
    @ApiPropertyOptional({ description: "User display name", maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @ApiPropertyOptional({ description: "Avatar URL", maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    @IsUrl({}, { message: "Avatar must be a valid URL" })
    avatar?: string;

    @ApiPropertyOptional({ description: "User bio/description" })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    bio?: string;
}
