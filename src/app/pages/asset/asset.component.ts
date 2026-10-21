import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModuleShare } from '../../ng-zorror-antd.module';

@Component({
    selector: 'app-asset',
    templateUrl: './asset.component.html',
    styleUrl: './asset.component.scss',
    standalone: true,
    imports: [
        RouterOutlet,
        ModuleShare
    ],
})
export class AssetComponent {}
