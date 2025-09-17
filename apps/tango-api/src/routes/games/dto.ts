import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetGamesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true))
  @IsBoolean()
  includeDlc?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : undefined))
  genre?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : undefined))
  platform?: string[];

  @IsOptional()
  @IsIn(['title', 'release', 'rating'])
  order?: 'title' | 'release' | 'rating' = 'title';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(50)
  take?: number = 20;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  skip?: number = 0;
}

