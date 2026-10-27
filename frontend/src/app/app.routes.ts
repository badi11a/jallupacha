import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';
import { LoginComponent } from './core/auth/login.component';
import { NotFoundComponent } from './not-found.component';
import { unsavedChangesGuard } from './core/auth/unsaved-changes.guard';

/** Página de inicio: mapa de procesos. */
export const HOME_URL = '/mapa';

/** Nombre visible de la aplicación (marca y títulos de pantalla). */
export const APP_NAME = 'Sistema de Procesos Institucionales';

// Arquitectura v15 (REQ-25): Autenticación local institucional y control de acceso.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { title: 'Acceso Institucional', path: 'login', component: LoginComponent, canActivate: [guestGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Mapa de procesos', path: 'mapa', loadComponent: () => import('./features/processes/process-map.component').then(module => module.ProcessMapComponent), canActivate: [authGuard] },
  { title: 'Detalle de macroproceso', path: 'mapa/macroprocesos/:id', loadComponent: () => import('./features/processes/macroprocess-detail.component').then(module => module.MacroprocessDetailComponent), canActivate: [authGuard] },
  { title: 'Procesos', path: 'procesos', loadComponent: () => import('./features/processes/process-list.component').then(module => module.ProcessListComponent), canActivate: [authGuard] },
  { title: 'Nuevo proceso', path: 'procesos/nuevo', loadComponent: () => import('./features/processes/process-form.component').then(module => module.ProcessFormComponent), canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Ficha del proceso', path: 'procesos/:id', loadComponent: () => import('./features/processes/process-detail.component').then(module => module.ProcessDetailComponent), canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Editar proceso', path: 'procesos/:id/editar', loadComponent: () => import('./features/processes/process-form.component').then(module => module.ProcessFormComponent), canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Unidades internas', path: 'unidades', loadComponent: () => import('./features/catalogs/units.component').then(module => module.UnitsComponent), canActivate: [adminGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Tipos de proceso', path: 'tipos-de-proceso', loadComponent: () => import('./features/catalogs/process-types.component').then(module => module.ProcessTypesComponent), canActivate: [adminGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Gestión de usuarios y perfiles', path: 'usuarios', loadComponent: () => import('./features/users/users.component').then(module => module.UsersComponent), canActivate: [adminGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Bitácora de auditoría inmutable', path: 'auditoria', loadComponent: () => import('./features/audit/audit.component').then(module => module.AuditComponent), canActivate: [adminGuard] },
  { title: 'Página no encontrada', path: '**', component: NotFoundComponent }
];
