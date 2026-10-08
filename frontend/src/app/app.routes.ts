import { Routes } from '@angular/router';
import { NotFoundComponent } from './not-found.component';
import { ProcessWorkspaceComponent } from './process-workspace.component';
import { unsavedChangesGuard } from './unsaved-changes.guard';

// Una ruta no concede acceso: el servidor autoriza cada llamada (docs/arquitectura.md, «navegación por rutas»).
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'procesos' },
  { path: 'procesos', component: ProcessWorkspaceComponent, data: { mode: 'list' } },
  { path: 'procesos/nuevo', component: ProcessWorkspaceComponent, data: { mode: 'create' }, canDeactivate: [unsavedChangesGuard] },
  { path: 'procesos/:id', component: ProcessWorkspaceComponent, data: { mode: 'detail' } },
  { path: 'procesos/:id/editar', component: ProcessWorkspaceComponent, data: { mode: 'edit' }, canDeactivate: [unsavedChangesGuard] },
  { path: '**', component: NotFoundComponent }
];
