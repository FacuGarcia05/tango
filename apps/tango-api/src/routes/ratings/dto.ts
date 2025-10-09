import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateRatingDto {
  @ApiProperty({ minimum: 0, maximum: 5, example: 4 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(5)
  value!: number;
}
