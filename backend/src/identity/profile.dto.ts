import { ArrayUnique, IsArray, IsIn, IsInt, Min } from 'class-validator';
import { ProfileCode } from '../common/auth.types';
import { ApiProperty } from '@nestjs/swagger';

const PROFILES: ProfileCode[] = ['ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER', 'CONSULTATION'];

export class UpdateProfilesDto {
  @ApiProperty({ type: [String], enum: PROFILES })
  @IsArray()
  @ArrayUnique()
  @IsIn(PROFILES, { each: true })
  profiles!: ProfileCode[];
}

export class UserIdParamDto {
  @IsInt()
  @Min(1)
  id!: number;
}
