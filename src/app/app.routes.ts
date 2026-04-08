import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'salas', pathMatch: 'full' },
  {
    path: 'salas',
    loadComponent: () =>
      import('./pages/sala-list/sala-list.component').then(m => m.SalaListComponent)
  },
  {
    path: 'sala/:id/proyecciones',
    loadComponent: () =>
      import('./pages/proyeccion-list/proyeccion-list.component').then(m => m.ProyeccionListComponent)
  },
  {
    path: 'sala/:id',
    loadComponent: () =>
      import('./pages/sala-detail/sala-detail.component').then(m => m.SalaDetailComponent)
  },
  { path: '**', redirectTo: 'salas' }
];
