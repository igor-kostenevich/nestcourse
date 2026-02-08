import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;
}

export interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export const getPaginationDefaults = () => ({
  defaultLimit: DEFAULT_LIMIT,
  maxLimit: MAX_LIMIT,
});
