import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateListDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 120)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @Length(3, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;
}

export class AddListItemDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 190)
  gameSlug!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}

export class RemoveListItemParams {
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  gameSlug!: string;
}

export class ReorderListItemDto {
  @IsUUID()
  gameId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  position!: number;
}

export class ReorderListDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderListItemDto)
  items!: ReorderListItemDto[];
}
