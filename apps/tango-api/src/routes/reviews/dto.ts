import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gameId: string;

  @ApiPropertyOptional({ example: 'Mi reseña' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ minLength: 10, example: 'Texto de al menos 10 caracteres' })
  @IsString()
  @MinLength(10)
  body: string;

  @ApiProperty({ type: Boolean, example: false })
  @IsBoolean()
  hasSpoilers: boolean;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 'Título editado' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ minLength: 10 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  body?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  hasSpoilers?: boolean;
}

export class ListReviewsQueryDto {
  @ApiProperty({ required: false, default: 20, maximum: 50 })
  @Transform(({ value }) => Number(value))
  @Min(0)
  @Max(50)
  take?: number = 20;

  @ApiProperty({ required: false, default: 0 })
  @Transform(({ value }) => Number(value))
  @Min(0)
  skip?: number = 0;
}

