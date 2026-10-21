import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UnitRoutingModule } from './unit-routing.module';
import {UnitComponent} from './unit.component';


@NgModule({
  declarations: [],
    imports: [
        CommonModule,
        UnitRoutingModule,
        UnitComponent
    ]
})
export class UnitModule { }
