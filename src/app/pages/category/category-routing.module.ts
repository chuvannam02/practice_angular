import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ListCategoryComponent} from './list-category/list-category.component';

const routes: Routes = [
    {
        path: '',
        component: ListCategoryComponent
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CategoryRoutingModule { }
