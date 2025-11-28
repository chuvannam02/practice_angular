import {NzNotificationDataOptions, NzNotificationService} from 'ng-zorro-antd/notification';
import {Injectable, TemplateRef} from '@angular/core';

/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/28/2025
 * @Time: 3:57 AM
 * @File: AlertService.ts
 */
export type AlertType = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class AlertService {
    /**
     * Default title shown for all notifications
     */
    private readonly defaultTitle = 'Thông báo';

    constructor(private notification: NzNotificationService) {}

    /**
     * Generic notification method using default title
     * @param type - one of 'success' | 'error' | 'warning' | 'info'
     * @param message - main content of notification
     * @param description - optional additional text
     * @param options - override NzNotificationDataOptions
     */
    notify(
        type: AlertType,
        message: string,
        description?: string,
        options?: Partial<NzNotificationDataOptions>
    ) {
        this.notification.create(
            type,
            this.defaultTitle,
            message,
            {
                nzPlacement: 'topRight',
                nzPauseOnHover: true,
                nzDuration: 3000,
                ...options
            }
        );
    }

    success(
        message: string,
        description?: string,
        opts?: Partial<NzNotificationDataOptions>
    ) {
        this.notify('success', message, description, opts);
    }

    error(
        message: string,
        description?: string,
        opts?: Partial<NzNotificationDataOptions>
    ) {
        this.notify('error', message, description, opts);
    }

    warning(
        message: string,
        description?: string,
        opts?: Partial<NzNotificationDataOptions>
    ) {
        this.notify('warning', message, description, opts);
    }

    /** Shortcut for info notifications */
    info(
        message: string,
        description?: string,
        opts?: Partial<NzNotificationDataOptions>
    ) {
        this.notify('info', message, description, opts);
    }

    /**
     * Custom template notification using default title
     * @param tpl - TemplateRef with any context
     * @param data - data passed into template
     * @param options - override NzNotificationDataOptions
     */
    custom<T>(
        tpl: TemplateRef<T>,
        data: T,
        options?: Partial<NzNotificationDataOptions>
    ) {
        // @ts-ignore
        this.notification.template(tpl, {
            nzData: data,
            nzPlacement: 'topRight',
            nzPauseOnHover: false,
            nzDuration: 0,
            ...options
        });
    }
}
