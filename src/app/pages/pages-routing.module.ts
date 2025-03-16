import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PagesComponent} from './pages.component';

const routes: Routes = [
    {
        path: '',
        component: PagesComponent,
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'welcome'
            },
            {
                path: 'welcome',
                loadChildren: () => import('./welcome/welcome.module').then(m => m.WelcomeModule),
                data: {
                    title: 'Welcome',
                    breadcrumb: 'Welcome'
                }
            },
            {
                path: 'menu',
                loadChildren: () => import('./menu/menu.module').then(m => m.MenuModule),
                data: {
                    title: 'Quản lý chức năng',
                    breadcrumb: 'Quản lý chức năng'
                }
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PagesRoutingModule {
}
