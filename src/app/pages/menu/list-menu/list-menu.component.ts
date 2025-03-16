import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {
    AbstractControl,
    FormGroup,
    NonNullableFormBuilder,
    ValidationErrors,
    Validators
} from '@angular/forms';
import {Observable, Subject} from 'rxjs';
import {IMenu} from '../menu.model';
import {NzModalService} from 'ng-zorro-antd/modal';
import {AddEditMenuComponent} from '../add-edit-menu/add-edit-menu.component';

@Component({
    selector: 'app-list-menu',
    templateUrl: './list-menu.component.html',
    styleUrl: './list-menu.component.scss',
    standalone: false
})
export class ListMenuComponent implements OnInit, OnDestroy  {
    searchForm: FormGroup = new FormGroup({});
    private readonly fb = inject(NonNullableFormBuilder);
    private destroy$ = new Subject<void>();
    loading: boolean = false;
    data: any[] = [];
    pageSizeOptions: number[] = [10, 20, 30, 40, 50];

    constructor(private readonly nzModalService: NzModalService) {
        this.initForm();
    }

    ngOnInit() {
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    initForm() {
        this.searchForm = this.fb.group({
            name: this.fb.control('', {
                validators: [Validators.required],
                // đưa hàm this.userNameAsyncValidator vào mảng asyncValidators để Angular biết đây là async validator (xử lý bất đồng bộ)
                asyncValidators: [this.userNameAsyncValidator]
            }),
            code: this.fb.control('', {
                validators: [Validators.required],
            }),
        })
    }
    // Sử dụng [nzValidateStatus]="searchForm.get('keySearch')!" để đảm bảo rằng control luôn có giá trị (sử dụng non-null assertion).
    // Sử dụng [nzHasFeedback]="true" để hiển thị icon feedback.
    // Sử dụng [nzErrorTip]="{required: 'This field is required', error: 'This field is duplicated'}" để hiển thị thông báo lỗi.
    // Sử dụng [nzSize]="'large'" để đưa size cho form.
    // Sử dụng [nzShowSearch]="true" để hiển thị search box.
    // Sử dụng [nzShowSorter]="true" để hiển thị sorter.

    search() {
        Object.keys(this.searchForm.controls).forEach(key => {
            const control = this.searchForm.get(key);
            if (control) {
                control.markAsDirty();
                control.updateValueAndValidity();
            }
        });

        console.log(this.searchForm.value);
    }

    // tùy chọn onlySelf: true
    // có nghĩa là chỉ cập nhật lại giá trị và trạng thái xác thực của control hiện tại mà không lan tỏa cập nhật đó lên các control cha (parent controls).
    // Điều này hữu ích khi bạn chỉ muốn thay đổi riêng cho control đó mà không làm thay đổi trạng thái của cả form hay group chứa nó.

    reset($event: MouseEvent) {
        $event.preventDefault();
        this.searchForm.reset();
    }

    add() {

    }

    userNameAsyncValidator(control: AbstractControl): Observable<ValidationErrors | null> {
        return new Observable(observer => {
            setTimeout(() => {
                observer.next(control.value === 'JasonWood' ? { error: true, duplicated: true } : null);
                observer.complete();
            }, 1000);
        });
    }

    edit(menu: IMenu) {

    }

    delete(menu: IMenu) {

    }

    showModal() {
        const modal = this.nzModalService.create({
            nzTitle: 'Thêm mới chức năng',
            nzWidth: 800,
            nzContent: AddEditMenuComponent,
            nzFooter: [
                {
                    label: 'Hủy',
                    onClick: () => {
                        modal.destroy();
                    }
                },
                {
                    label: 'Lưu',
                    type: 'primary',
                    onClick: (componentInstance) => {
                        if (componentInstance?.addEditForm.valid) {
                            console.log('submit', componentInstance.addEditForm.value);
                        } else {
                            Object.values(componentInstance?.addEditForm.controls ?? {}).forEach(control => {
                                const abstractControl = control as AbstractControl;
                                if (abstractControl.invalid) {
                                    abstractControl.markAsDirty();
                                    abstractControl.updateValueAndValidity({ onlySelf: true });
                                }
                            });
                        }
                    }
                }
            ],
        });
    }

    trackByFn(index: number, item: any): number {
        return item.id;
    }
}
