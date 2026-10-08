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

export class ProcessFieldsDto {
  @ApiPropertyOptional({ type: String, maxLength: 250, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(250)
  @plainText
  name?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 250, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(250)
  @plainText
  alias?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  description?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  objective?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  scope?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  inputs?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  outputs?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  suppliers?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  clients?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  involvedParties?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  startsWhen?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  endsWhen?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  developmentPlan?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  operation?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  design?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 10000, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(10000)
  @plainText
  validation?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 250, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(250)
  @plainText
  businessArea?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 250, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(250)
  @plainText
  subprocessType?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 250, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(250)
  @plainText
  criticality?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 250, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(250)
  @plainText
  automationLevel?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 250, nullable: true })
  @IsOptional()
  @trimText
  @IsString()
  @MaxLength(250)
  @plainText
  periodicity?: string | null;
}

export class CreateProcessDto extends ProcessFieldsDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  macroprocessId!: number;

  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  processTypeId!: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentProcessId?: number | null;
}

export class UpdateProcessDto extends ProcessFieldsDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  revision!: number;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  macroprocessId?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  processTypeId?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentProcessId?: number | null;
}

export class ReassignProcessOwnerDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ownerUserId!: number;

  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  revision!: number;
}

export class ListProcessesQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ProcessCommonResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'PR1' })
  code!: string;

  @ApiProperty()
  macroprocessId!: number;

  @ApiProperty()
  macroprocessName!: string;

  @ApiProperty()
  processTypeId!: number;

  @ApiProperty()
  processTypeName!: string;

  @ApiProperty()
  ownerUserId!: number;

  @ApiProperty()
  ownerDisplayName!: string;

  @ApiProperty({ enum: ['Borrador'] })
  status!: string;

  @ApiProperty({ type: Number, minimum: 1 })
  revision!: number;
}

export class ProcessListItemResponseDto extends ProcessCommonResponseDto {
  @ApiProperty({ example: 'Sin nombre' })
  name!: string;
}

export class ProcessPageResponseDto {
  @ApiProperty({ type: [ProcessListItemResponseDto] })
  items!: ProcessListItemResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty({ maximum: 100 })
  limit!: number;
}

export class ProcessResponseDto extends ProcessCommonResponseDto {
  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty({ type: Number, nullable: true })
  parentProcessId!: number | null;

  @ApiProperty({ type: String, nullable: true })
  alias!: string | null;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  objective!: string | null;

  @ApiProperty({ type: String, nullable: true })
  scope!: string | null;

  @ApiProperty({ type: String, nullable: true })
  inputs!: string | null;

  @ApiProperty({ type: String, nullable: true })
  outputs!: string | null;

  @ApiProperty({ type: String, nullable: true })
  suppliers!: string | null;

  @ApiProperty({ type: String, nullable: true })
  clients!: string | null;

  @ApiProperty({ type: String, nullable: true })
  involvedParties!: string | null;

  @ApiProperty({ type: String, nullable: true })
  startsWhen!: string | null;

  @ApiProperty({ type: String, nullable: true })
  endsWhen!: string | null;

  @ApiProperty({ type: String, nullable: true })
  developmentPlan!: string | null;

  @ApiProperty({ type: String, nullable: true })
  operation!: string | null;

  @ApiProperty({ type: String, nullable: true })
  design!: string | null;

  @ApiProperty({ type: String, nullable: true })
  validation!: string | null;

  @ApiProperty({ type: String, nullable: true })
  businessArea!: string | null;

  @ApiProperty({ type: String, nullable: true })
  subprocessType!: string | null;

  @ApiProperty({ type: String, nullable: true })
  criticality!: string | null;

  @ApiProperty({ type: String, nullable: true })
  automationLevel!: string | null;

  @ApiProperty({ type: String, nullable: true })
  periodicity!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Solo lectura en este incremento.' })
  internalUnits!: null;

  @ApiProperty({ type: String, nullable: true, description: 'Solo lectura en este incremento.' })
  bpmnModel!: null;
}
