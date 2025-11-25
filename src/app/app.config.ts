import {ApplicationConfig, inject, Injector, provideAppInitializer} from '@angular/core';
import { provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { icons } from './icons-provider';
import { provideNzI18n, vi_VN } from 'ng-zorro-antd/i18n';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import {setAppInjector} from './_utils/app-injector';
import {NzModalModule} from 'ng-zorro-antd/modal';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideNzIcons(icons),
        provideNzI18n(vi_VN),
        importProvidersFrom(FormsModule),
        provideAnimationsAsync(),
        provideHttpClient(),
        // Cung cấp NzModalService cho toàn bộ App để Decorator có thể dùng
        importProvidersFrom(NzModalModule),
        // --- PHẦN QUAN TRỌNG NHẤT ---
        // Khởi tạo Injector toàn cục ngay khi app start
        provideAppInitializer(() => {
            const injector = inject(Injector);
            setAppInjector(injector);
        }),
    ]
};
