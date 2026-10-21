import {ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {ICON_SETS} from '../icon-data';
import {NzModalComponent, NzModalContentDirective} from 'ng-zorro-antd/modal';
import {NzTabComponent, NzTabSetComponent} from 'ng-zorro-antd/tabs';
import {NgIcon} from '@ng-icons/core';
import {NzEmptyComponent} from 'ng-zorro-antd/empty';
import {NgForOf, NgIf, SlicePipe} from '@angular/common';
import {NzInputDirective, NzInputGroupComponent} from 'ng-zorro-antd/input';
import {FormsModule} from '@angular/forms';
import {NzButtonComponent} from 'ng-zorro-antd/button';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {debounceTime, distinctUntilChanged, Subject, Subscription, tap} from 'rxjs';

@Component({
    selector: 'app-icon-picker',
    imports: [
        NzModalComponent,
        NzTabSetComponent,
        NgIcon,
        ScrollingModule,
        NzEmptyComponent,
        SlicePipe,
        NzTabComponent,
        NzInputGroupComponent,
        FormsModule,
        NzButtonComponent,
        NzInputDirective,
        NzIconDirective,
        NgForOf,
        NgIf,
        NzModalContentDirective
    ],
    templateUrl: './icon-picker.component.html',
    styleUrl: './icon-picker.component.scss',
})
export class IconPickerComponent implements OnInit, OnDestroy {
    @Output() iconSelected = new EventEmitter<string>();

    isVisible = false;
    isLoading = false;
    searchText = '';
    selectedType: 'outline' | 'solid' | 'mini' = 'outline';
    tabIndex = 0;

    // Cấu hình Grid cho Virtual Scroll
    readonly COL_COUNT = 6; // Số cột (số icon trên 1 hàng)
    readonly ROW_HEIGHT = 90; // Chiều cao 1 hàng (px) - khớp với CSS

    // Dữ liệu hiển thị (Đã chia thành các hàng)
    virtualRows: string[][] = [];

    // RxJS để xử lý search debounce
    private readonly searchSubject = new Subject<string>();
    private readonly subscription: Subscription = new Subscription();

    allIconSets = ICON_SETS;

    ngOnInit(): void {
        // Khởi tạo dữ liệu ban đầu
        this.processData();

        // Lắng nghe sự kiện search với debounce 300ms
        const searchSub = this.searchSubject.pipe(
            tap(() => this.isLoading = true), // Bật loading khi bắt đầu gõ
            debounceTime(300),                // Đợi 300ms sau khi ngừng gõ
            distinctUntilChanged()            // Chỉ chạy nếu nội dung thay đổi
        ).subscribe((text) => {
            this.searchText = text;
            this.processData(); // Tính toán lại danh sách
            this.isLoading = false; // Tắt loading
        });

        this.subscription.add(searchSub);
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    // Hàm được gọi mỗi khi input thay đổi (gắn vào (ngModelChange))
    onSearchChange(text: string): void {
        this.searchSubject.next(text);
    }

    // Hàm chuyển tab
    onTabChange(tabTitle: string): void {
        this.selectedType = tabTitle.toLowerCase() as any;
        this.searchText = ''; // Reset search khi đổi tab (tuỳ chọn)
        this.processData();
    }

    // Hàm xử lý chính: Filter -> Chunk data thành các row
    private processData(): void {
        // 1. Lấy dữ liệu thô
        const currentSet = this.allIconSets[this.selectedType] || [];

        // 2. Filter theo search text
        let filtered = currentSet;
        if (this.searchText) {
            const lowerSearch = this.searchText.toLowerCase();
            filtered = currentSet.filter(icon => icon.toLowerCase().includes(lowerSearch));
        }

        // 3. Chunking: Chia mảng phẳng [1,2,3,4,5,6,7] thành [[1,2,3], [4,5,6], [7]]
        // Để Virtual Scroll render từng hàng một
        const rows: string[][] = [];
        for (let i = 0; i < filtered.length; i += this.COL_COUNT) {
            rows.push(filtered.slice(i, i + this.COL_COUNT));
        }

        this.virtualRows = rows;
    }

    openModal(): void {
        this.isVisible = true;
        // Cần kích hoạt render lại grid nếu modal mở lần đầu
        setTimeout(() => this.processData(), 100);
    }

    handleCancel(): void {
        this.isVisible = false;
    }

    selectIcon(iconName: string): void {
        this.iconSelected.emit(iconName);
        this.isVisible = false;
    }
}
