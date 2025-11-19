import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePartyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  platform!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  timezone!: string;

  @IsInt()
  @Min(2)
  @Max(16)
  capacity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;
}
