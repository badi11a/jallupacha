import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, ProfileCode } from './auth.types';

export const IS_PUBLIC = 'isPublic';
export const REQUIRED_PROFILES = 'requiredProfiles';

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const RequireProfiles = (...profiles: ProfileCode[]) => SetMetadata(REQUIRED_PROFILES, profiles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    (context.switchToHttp().getRequest() as AuthenticatedRequest).authUser
);
