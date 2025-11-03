import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ListReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skip?: number;
}

export class CreateReviewDto {
  @IsUUID()
  gameId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  hasSpoilers?: boolean;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  body?: string;

  @IsOptional()
  @IsBoolean()
  hasSpoilers?: boolean;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}
