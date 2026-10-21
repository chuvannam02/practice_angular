import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const message = inject(NzMessageService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                message.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

                localStorage.removeItem('access_token');

                router.navigate(['/login']);
            }

            return throwError(() => error);
        })
    );
};
