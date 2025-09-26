import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return false;
}

function normalizeStringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const tokens = rawValues.flatMap((entry) => {
    if (typeof entry === 'string') {
      return entry.split(',');
    }
    return String(entry);
  });

  const normalized = Array.from(
    new Set(
      tokens
        .map((token) => (typeof token === 'string' ? token.trim() : String(token)))
        .filter((token): token is string => token.length > 0)
        .map((token) => token.toLowerCase()),
    ),
  );

  return normalized.length ? normalized : undefined;
}

function normalizeOrder(value: unknown, fallback: 'title' | 'release' | 'rating') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.toLowerCase();
  return ['title', 'release', 'rating'].includes(normalized)
    ? (normalized as 'title' | 'release' | 'rating')
    : fallback;
}

function normalizeDirection(value: unknown, fallback: 'asc' | 'desc') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.toLowerCase();
  return normalized === 'desc' ? 'desc' : 'asc';
}

function normalizeTake(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(50, Math.max(1, Math.trunc(parsed)));
}

function normalizeSkip(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}

export class GetGamesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeBoolean(value))
  @IsBoolean()
  includeDlc: boolean = false;

  @IsOptional()
  @Transform(({ value }) => normalizeStringList(value))
  genre?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeStringList(value))
  platform?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeOrder(value, 'title'))
  @IsIn(['title', 'release', 'rating'])
  order: 'title' | 'release' | 'rating' = 'title';

  @IsOptional()
  @Transform(({ value }) => normalizeDirection(value, 'asc'))
  @IsIn(['asc', 'desc'])
  direction: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Transform(({ value }) => normalizeTake(value, 20))
  @IsInt()
  @Min(1)
  @Max(50)
  take: number = 20;

  @IsOptional()
  @Transform(({ value }) => normalizeSkip(value, 0))
  @IsInt()
  @Min(0)
  skip: number = 0;
}
