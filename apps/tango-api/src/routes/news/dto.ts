import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 180)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  source!: string;

  @IsUrl()
  source_url!: string;

  @IsString()
  @IsNotEmpty()
  @Length(30, 1000)
  excerpt!: string;

  @IsOptional()
  @IsUrl()
  cover_url?: string;

  @IsISO8601()
  published_at!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_featured?: boolean;
}

export class UpdateNewsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(5, 180)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  source?: string;

  @IsOptional()
  @IsUrl()
  source_url?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(30, 1000)
  excerpt?: string;

  @IsOptional()
  @IsUrl()
  cover_url?: string | null;

  @IsOptional()
  @IsISO8601()
  published_at?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_featured?: boolean;
}
