import { Routes } from '@angular/router';
import { AuditComponent } from './audit.component';
import { authGuard, guestGuard } from './auth.guard';
import { LoginComponent } from './login.component';
import { MacroprocessDetailComponent } from './macroprocess-detail.component';
import { MvpV14DemoComponent } from './mvp-v14-demo.component';
import { NotFoundComponent } from './not-found.component';
import { ProcessDetailComponent } from './process-detail.component';
import { ProcessFormComponent } from './process-form.component';
import { ProcessListComponent } from './process-list.component';
import { ProcessTypesComponent } from './process-types.component';
import { UnitsComponent } from './units.component';
import { UsersComponent } from './users.component';
import { unsavedChangesGuard } from './unsaved-changes.guard';

/** Página de inicio: mapa de procesos. */
export const HOME_URL = '/mapa';

/** Nombre visible de la aplicación (marca y títulos de pantalla). */
export const APP_NAME = 'Sistema de Procesos Institucionales';

// Arquitectura v15 (REQ-25): Autenticación local institucional y control de acceso.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { title: 'Acceso Institucional', path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { title: 'Mapa de procesos', path: 'mapa', component: MvpV14DemoComponent, canActivate: [authGuard] },
  { title: 'Detalle de macroproceso', path: 'mapa/macroprocesos/:id', component: MacroprocessDetailComponent, canActivate: [authGuard] },
  { title: 'Procesos', path: 'procesos', component: ProcessListComponent, canActivate: [authGuard] },
  { title: 'Nuevo proceso', path: 'procesos/nuevo', component: ProcessFormComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Ficha del proceso', path: 'procesos/:id', component: ProcessDetailComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Editar proceso', path: 'procesos/:id/editar', component: ProcessFormComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Unidades internas', path: 'unidades', component: UnitsComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Tipos de proceso', path: 'tipos-de-proceso', component: ProcessTypesComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Gestión de usuarios y perfiles', path: 'usuarios', component: UsersComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
  { title: 'Bitácora de auditoría inmutable', path: 'auditoria', component: AuditComponent, canActivate: [authGuard] },
  { title: 'Página no encontrada', path: '**', component: NotFoundComponent }
];
