import { daily_tango_mode } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GuessWordDto {
  @IsString()
  @MinLength(3)
  @MaxLength(10)
  guess!: string;
}

export class MemoryResultDto {
  @IsInt()
  @Min(1)
  moves!: number;

  @IsInt()
  @Min(0)
  mistakes!: number;

  @IsInt()
  @Min(1)
  durationMs!: number;
}

export class ReactionResultDto {
  @IsInt()
  @Min(1)
  durationMs!: number;
}

export class LeaderboardQueryDto {
  @IsOptional()
  @IsEnum(daily_tango_mode)
  mode?: daily_tango_mode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;
}
