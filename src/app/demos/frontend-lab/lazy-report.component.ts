import { Component } from '@angular/core';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';

@Component({
    selector: 'app-lazy-report',
    standalone: true,
    imports: [NzProgressModule, NzStatisticModule],
    template: `
        <div class="report" data-demo="lazy-report">
            <div>
                <p class="ready">Component báo cáo đã được tải</p>
                <nz-statistic nzTitle="Đơn hàng minh họa" [nzValue]="128"></nz-statistic>
            </div>
            <div>
                <p>Tỷ lệ hoàn thành minh họa</p>
                <nz-progress [nzPercent]="76"></nz-progress>
                <small>Đây là dữ liệu mẫu, không phải số đo hiệu năng.</small>
            </div>
        </div>
    `,
    styles: `
        .report { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; padding: 20px; border: 1px solid #bce4ce; border-radius: 12px; background: #f6fcf8; }
        .ready { color: #17613d; font-weight: 600; }
        small { color: #62708a; }
        @media (max-width: 600px) { .report { grid-template-columns: 1fr; } }
    `,
})
export class LazyReportComponent {}
