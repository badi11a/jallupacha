import { Routes } from '@angular/router';
import { AuditComponent } from './administration/audit.component';
import { CatalogsComponent } from './administration/catalogs.component';
import { ProfilesComponent } from './administration/profiles.component';
import { NotFoundComponent } from './not-found.component';
import { ProcessMapComponent } from './process-map.component';
import { ProcessRisksComponent } from './process-risks.component';
import { ProcessWorkspaceComponent } from './process-workspace.component';
import { unsavedChangesGuard } from './unsaved-changes.guard';

/** Entrada de la aplicación autenticada (Release 01: mapa interno). */
export const HOME_URL = '/mapa';

/** Nombre visible de la aplicación (marca y títulos de pantalla). */
export const APP_NAME = 'Sistema de Procesos Institucionales';

// Una ruta no concede acceso: el servidor autoriza cada llamada (docs/arquitectura.md, «navegación por rutas»).
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { title: 'Mapa de procesos', path: 'mapa', component: ProcessMapComponent, data: { mode: 'map' } },
  { title: 'Macroproceso', path: 'mapa/macroprocesos/:id', component: ProcessMapComponent, data: { mode: 'macroprocess' } },
  { title: 'Procesos', path: 'procesos', component: ProcessWorkspaceComponent, data: { mode: 'list' } },
  { title: 'Nuevo proceso', path: 'procesos/nuevo', component: ProcessWorkspaceComponent, data: { mode: 'create' }, canDeactivate: [unsavedChangesGuard] },
  { title: 'Ficha del proceso', path: 'procesos/:id', component: ProcessWorkspaceComponent, data: { mode: 'detail' } },
  { title: 'Editar proceso', path: 'procesos/:id/editar', component: ProcessWorkspaceComponent, data: { mode: 'edit' }, canDeactivate: [unsavedChangesGuard] },
  { title: 'Riesgos del proceso', path: 'procesos/:id/riesgos', component: ProcessRisksComponent, canDeactivate: [unsavedChangesGuard] },
  // Administración (C-008): pantallas propias; Perfiles y Auditoría solo para Administrador (verificado en servidor).
  { title: 'Catálogos', path: 'administracion/catalogos', component: CatalogsComponent },
  { title: 'Perfiles de usuario', path: 'administracion/perfiles', component: ProfilesComponent },
  { title: 'Auditoría', path: 'administracion/auditoria', component: AuditComponent },
  { title: 'Página no encontrada', path: '**', component: NotFoundComponent }
];
