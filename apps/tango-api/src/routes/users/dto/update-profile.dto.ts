import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }) => trim(value))
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  @Transform(({ value }) => trim(value))
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  backdropUrl?: string | null;
}
