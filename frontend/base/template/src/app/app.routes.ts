import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { pendingGuard, sessionGuard } from './session';
@Component({ template: '<h1>Inicio</h1><p>Base de aplicación de la organización.</p>' })
class HomeComponent {}
export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: HomeComponent, title: 'Inicio' },
  { path: 'login', loadComponent: () => import('./features/access/access.component').then(module => module.AccessComponent), title: 'Acceso', canDeactivate: [pendingGuard] },
  { path: 'ejemplo', loadComponent: () => import('./features/example/example.component').then(module => module.ExampleComponent), title: 'Ejemplo de formulario', canActivate: [sessionGuard], canDeactivate: [pendingGuard] },
  { path: '**', redirectTo: 'inicio' }
];
