import { Request } from 'express';

export type ProfileCode = 'ADMIN' | 'PROCESS_OWNER' | 'RISK_MANAGER' | 'CONSULTATION';

export interface AuthenticatedUser {
  id: number;
  profiles: ProfileCode[];
  sessionHash: string;
  csrfHash: string;
}

export type AuthenticatedRequest = Request & { authUser: AuthenticatedUser };
