import { Routes } from '@angular/router';
import { AuthPage } from './features/auth/auth-page/auth-page';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';

export const routes: Routes = [
  { path: 'login', component: AuthPage },
  { path: 'dashboard', component: DashboardPage },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
