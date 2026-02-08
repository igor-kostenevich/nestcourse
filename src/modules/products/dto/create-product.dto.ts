import { IsInt, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock: number;
}
