import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { createSessionInterceptor } from '../platform';

export const authInterceptor = createSessionInterceptor(() => inject(AuthService));
