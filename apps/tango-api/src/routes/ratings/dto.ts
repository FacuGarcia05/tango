import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class UpsertRatingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gameId: string;

  @ApiProperty({ minimum: 0.5, maximum: 5.0, example: 4.5 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  score: number;
}

