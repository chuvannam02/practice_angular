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
            },
            {
                path: 'user',
                loadChildren: () => import('./user/user.module').then(m => m.UserModule),
                data: {
                    title: 'Quản lý người dùng',
                    breadcrumb: 'Quản lý người dùng'
                }
            },
            {
                path: 'category',
                loadChildren: () => import('./category/category.module').then(m => m.CategoryModule),
                data: {
                    title: 'Quản lý danh mục',
                    breadcrumb: 'Quản lý danh mục'
                }
            },
            {
                path: 'log',
                loadChildren: () => import('./log/log.module').then(m => m.LogModule),
                data: {
                    title: 'Quản lý nhật ký',
                    breadcrumb: 'Quản lý nhật ký'
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
