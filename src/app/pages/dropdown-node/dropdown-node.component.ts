import {Component, Input} from '@angular/core';

@Component({
    selector: 'app-dropdown-node',
    imports: [],
    templateUrl: './dropdown-node.component.html',
    styleUrl: './dropdown-node.component.scss'
})
export class DropdownNodeComponent {
    @Input() label!: string;
    @Input() taskId!: string;
}
