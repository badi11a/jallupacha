import { Routes } from '@angular/router';
import { NotFoundComponent } from './not-found.component';
import { MvpV14DemoComponent } from './mvp-v14-demo.component';
import { ProcessDetailComponent } from './process-detail.component';
import { ProcessFormComponent } from './process-form.component';
import { ProcessListComponent } from './process-list.component';
import { ProcessTypesComponent } from './process-types.component';
import { UnitsComponent } from './units.component';

/** Página de inicio: mapa de procesos. */
export const HOME_URL = '/mapa';

/** Nombre visible de la aplicación (marca y títulos de pantalla). */
export const APP_NAME = 'Sistema de Procesos Institucionales';

// MVP v14 de operador único (C-011): sin autenticación ni perfiles; la navegación es la definida en docs/arquitectura_mvp_v14.md.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { title: 'Mapa de procesos', path: 'mapa', component: MvpV14DemoComponent },
  { title: 'Procesos', path: 'procesos', component: ProcessListComponent },
  { title: 'Nuevo proceso', path: 'procesos/nuevo', component: ProcessFormComponent },
  { title: 'Ficha del proceso', path: 'procesos/:id', component: ProcessDetailComponent },
  { title: 'Editar proceso', path: 'procesos/:id/editar', component: ProcessFormComponent },
  { title: 'Unidades internas', path: 'unidades', component: UnitsComponent },
  { title: 'Tipos de proceso', path: 'tipos-de-proceso', component: ProcessTypesComponent },
  { title: 'Página no encontrada', path: '**', component: NotFoundComponent }
];
