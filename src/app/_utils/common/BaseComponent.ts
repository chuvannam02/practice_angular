import {firstValueFrom, Observable, shareReplay, Subject, take, takeUntil} from "rxjs";
import {FormGroup} from '@angular/forms';
import {NzModalRef, NzModalService} from 'ng-zorro-antd/modal';
import {Directive, inject, OnDestroy} from '@angular/core';

/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/28/2025
 * @Time: 3:55 AM
 * @File: BaseComponent.ts
 */
@Directive()
export abstract class BaseComponent implements OnDestroy {
    protected destroy$ = new Subject<void>();
// Dùng inject() thay vì constructor để tránh phải super() quá nhiều ở lớp con
    protected nzModalService = inject(NzModalService);
    // constructor(protected nzModalService: NzModalService) {}

    protected confirmCloseUnsaved(modal: NzModalRef): void {
        this.nzModalService.confirm({
            nzTitle: 'Thông báo xác nhận huỷ',
            nzContent: 'Dữ liệu thay đổi của bạn chưa được lưu. Bạn có chắc chắn muốn huỷ?',
            nzOkText: 'Xác nhận',
            nzOnOk: () => modal.destroy(),
        });
    }

    protected markFormTouched(form: FormGroup): void {
        Object.values(form.controls).forEach(control => {
            control.markAsDirty();
            control.updateValueAndValidity();
        });
    }

    protected handleCancel(modal: NzModalRef<any, any>): Promise<void> {
        return new Promise((resolve, reject) => {
            this.nzModalService.confirm({
                nzTitle: 'Thông báo xác nhận huỷ',
                nzContent: 'Dữ liệu thay đổi của bạn chưa được lưu. Bạn có chắc chắn muốn huỷ?',
                nzOnOk: () => {
                    modal.destroy();
                    resolve();
                },
                nzOnCancel: () => reject(),
                nzOkText: 'Xác nhận',
                nzCancelText: 'Huỷ',
            });
        });
    }

    /**
     * Converts an Observable or a Promise factory with AbortSignal to a Promise that respects component destruction.
     * For Observable, auto-unsubscribe on destroy$ emission.
     * For Promise factory, create AbortController and abort on destroy$.
     *
     * @param input Observable<T> | ((signal: AbortSignal) => Promise<T>)
     * @param destroy$ optional destroy subject, default to this.destroy$
     * @returns Promise<T>
     */
    protected async firstValueFromUntilDestroyed<T>(
        input: Observable<T> | ((signal: AbortSignal) => Promise<T>),
        destroy$: Subject<void> = this.destroy$
    ): Promise<T> {
        if (typeof input === 'function') {
            const controller = new AbortController();

            const sub = destroy$.pipe(take(1)).subscribe(() => {
                controller.abort();
                sub.unsubscribe();
            });

            try {
                return await input(controller.signal);
            } finally {
                sub.unsubscribe();
            }
        } else {
            try {
                // Provide a default value ([]) if the observable completes without emitting
                return await firstValueFrom(input.pipe(takeUntil(destroy$)), { defaultValue: [] as any });
            } catch (error) {
                throw error;
            }
        }
    }

    /**
     * RxJS operator to auto unsubscribe on destroy$
     */
    protected autoUnsubscribe<T>(
        destroy$: Subject<void> = this.destroy$
    ): (source$: Observable<T>) => Observable<T> {
        return (source$: Observable<T>) => source$.pipe(takeUntil(destroy$), shareReplay({ bufferSize: 1, refCount: true }));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.destroy$.unsubscribe();
    }

    protected createAbortController(destroy$: Subject<void> = this.destroy$): AbortController {
        const controller = new AbortController();
        destroy$.subscribe(() => controller.abort());
        return controller;
    }
}
