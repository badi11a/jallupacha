import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trimText = Transform(({ value }) => typeof value === 'string' ? value.trim() : value);
const plainText = Matches(/^(?![\s\S]*<\/?[a-z][^>]*>)[\s\S]*$/i, {
  message: 'HTML markup is not allowed'
});

export class CreateRiskDto {
  @ApiProperty({ type: String, maxLength: 10000 })
  @trimText
  @IsString()
  @MaxLength(10000)
  @Matches(/\S/, { message: 'Description is required' })
  @plainText
  description!: string;

  @ApiProperty({ type: String, maxLength: 10000 })
  @trimText
  @IsString()
  @MaxLength(10000)
  @Matches(/\S/, { message: 'Cause is required' })
  @plainText
  cause!: string;

  @ApiProperty({ type: String, maxLength: 10000 })
  @trimText
  @IsString()
  @MaxLength(10000)
  @Matches(/\S/, { message: 'Consequence is required' })
  @plainText
  consequence!: string;

  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  riskTypeId!: number;

  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  riskLevelId!: number;
}

export class CreateRiskListValueDto {
  @ApiProperty({ type: String, maxLength: 120 })
  @trimText
  @IsString()
  @MaxLength(120)
  @Matches(/\S/, { message: 'Name is required' })
  @plainText
  name!: string;
}

export class ListRisksQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 100;
}
