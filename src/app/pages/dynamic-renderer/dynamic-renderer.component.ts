import {
    Component,
    ComponentFactoryResolver,
    EmbeddedViewRef,
    Injector,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import {DropdownNodeComponent} from '../dropdown-node/dropdown-node.component';

@Component({
    selector: 'app-dynamic-renderer',
    templateUrl: './dynamic-renderer.component.html',
    styleUrl: './dynamic-renderer.component.scss'
})
export class DynamicRendererComponent {
    @ViewChild('canvas', {read: ViewContainerRef, static: true}) vcRef!: ViewContainerRef;

    constructor(
        private componentFactoryResolver: ComponentFactoryResolver,
        private injector: Injector
    ) {
    }

    ngOnInit() {
        const metadata = {
            type: 'dropdown',
            label: 'Chọn trạng thái',
            taskId: 'abc123'
        };

        const domNode = this.getRootNodeFromParsedComponent(metadata);
        const canvasElement = (this.vcRef.element.nativeElement as HTMLElement);
        canvasElement.appendChild(domNode); // gắn component vào vùng canvas
    }

    getRootNodeFromParsedComponent(config: any): HTMLElement {
        const componentFactory = this.componentFactoryResolver.resolveComponentFactory(DropdownNodeComponent);
        const ref = this.vcRef.createComponent(componentFactory, this.vcRef.length, this.injector);

        ref.instance.label = config.label;
        ref.instance.taskId = config.taskId;

        const hostView = ref.hostView as EmbeddedViewRef<any>;
        return hostView.rootNodes[0] as HTMLElement;
    }
}
