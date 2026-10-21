import {
    APP_INITIALIZER,
    ApplicationConfig,
    inject,
    Injector,
    provideAppInitializer,
} from '@angular/core';
import { provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { icons } from './icons-provider';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { setAppInjector } from './_utils/app-injector';
import { NzModalModule } from 'ng-zorro-antd/modal';
import {
    provideTanStackQuery,
    QueryClient,
} from '@tanstack/angular-query-experimental';
import { CspService } from './auth/csp/csp.service';
import { ALL_ICONS } from './_utils/common/icons/icon-data';
import { provideIcons } from '@ng-icons/core';

import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { NZ_I18N, vi_VN } from 'ng-zorro-antd/i18n';
import { jwtInterceptor } from './auth/interceptors/jwt.interceptor';
import { authErrorInterceptor } from './auth/interceptors/authError.interceptor';

// Factory function để chạy hàm initCsp
export function initializeCsp(cspService: CspService) {
    return () => cspService.initCsp();
}

registerLocaleData(localeVi);

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        // Đăng ký icon toàn cục ở đây
        provideIcons(ALL_ICONS),
        provideNzIcons(icons),
        importProvidersFrom(FormsModule),
        provideAnimationsAsync(),
        provideHttpClient(withInterceptors([jwtInterceptor, authErrorInterceptor])),
        // Cung cấp NzModalService cho toàn bộ App để Decorator có thể dùng
        importProvidersFrom(NzModalModule),
        // --- PHẦN QUAN TRỌNG NHẤT ---
        // Khởi tạo Injector toàn cục ngay khi app start
        provideAppInitializer(() => {
            const injector = inject(Injector);
            setAppInjector(injector);
        }),
        // Khởi tạo Query Client
        provideTanStackQuery(new QueryClient()),
        // Đăng ký CSP Service chạy lúc khởi động
        {
            provide: APP_INITIALIZER,
            useFactory: initializeCsp,
            deps: [CspService],
            multi: true,
        },
        { provide: NZ_I18N, useValue: vi_VN },
    ],
};
