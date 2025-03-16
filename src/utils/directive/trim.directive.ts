import {Directive, ElementRef, HostListener} from '@angular/core';
import {NgControl} from '@angular/forms';

@Directive({
    selector: '[trim]'
})
export class TrimDirective {

    constructor(
        private control: NgControl,
        private element: ElementRef
    ) {
    }

    @HostListener('focusout') onFocusOut() {
        const inputElement = this.element.nativeElement as HTMLInputElement;
        const trimmedValue = inputElement.value.trim();

        // update the element's value
        inputElement.value = trimmedValue;

        // update FormControl or ngModel value
        if (this.control && this.control.control) {
            this.control.control.setValue(trimmedValue);
            // this.control.control.updateValueAndValidity(); //
            // this.control.control.markAsTouched(); //
        }
    }
}
