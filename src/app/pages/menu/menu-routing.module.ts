import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ListMenuComponent} from './list-menu/list-menu.component';

const routes: Routes = [
    {
        path: '',
        component: ListMenuComponent,
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MenuRoutingModule {
}
