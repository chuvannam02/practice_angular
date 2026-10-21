import {Routes} from '@angular/router';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import {HomeComponent} from './home/home.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [

    {
        path: 'login',
        loadComponent: () =>
            import('./login/login.component')
                .then(m => m.LoginComponent)
    },

    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home'
    },

    {
        path: 'home',
        component: HomeComponent,
        canActivate: [authGuard]
    },

    {
        path: 'pages',
        canActivate: [authGuard],
        loadChildren: () =>
            import('./pages/pages.module')
                .then(m => m.PagesModule)
    },

    {
        path: '**',
        component: PageNotFoundComponent
    }
];
