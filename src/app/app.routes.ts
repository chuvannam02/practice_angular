import {Routes} from '@angular/router';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import {HomeComponent} from './home/home.component';

export const routes: Routes = [
    {path: '', pathMatch: 'full', redirectTo: 'home'},
    {path: 'home', component: HomeComponent},
    {path: 'pages', loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule)},
    {path: '**', component: PageNotFoundComponent}
];
