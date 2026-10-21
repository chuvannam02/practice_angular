import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzSelectComponent } from 'ng-zorro-antd/select';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
    let fixture: ComponentFixture<AppComponent>;
    let component: AppComponent;
    let select: NzSelectComponent;
    let overlay: HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [provideNoopAnimations()],
        }).compileComponents();
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        select = fixture.debugElement.query(By.directive(NzSelectComponent))
            .componentInstance;
        overlay = TestBed.inject(OverlayContainer).getContainerElement();
    });

    function render(): void {
        fixture.detectChanges();
        tick(16);
        fixture.detectChanges();
    }

    function openDropdown(): void {
        fixture.nativeElement.querySelector('nz-select').click();
        render();
    }

    function searchFor(keyword: string): void {
        const input = fixture.nativeElement.querySelector('input');
        input.value = keyword;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        render();
        tick(1050);
        render();
    }

    function selectLastCategory(): void {
        openDropdown();
        searchFor('CAT-0137');
        const option = overlay.querySelector<HTMLElement>(
            '.ant-select-item-option',
        );
        expect(option?.textContent).toContain('CAT-0137');
        option?.click();
        render();
        tick(700);
        render();
    }

    it('loads the first page on the first click despite the automatic empty search event', fakeAsync(() => {
        openDropdown();
        expect(component.isSearching).toBeTrue();
        expect(overlay.textContent).not.toContain('Không tìm thấy');

        tick(700);
        render();

        expect(component.categories.length).toBe(component.pageSize);
        expect(component.categories[0].id).toBe(1);
        expect(component.hasLoadedOnce).toBeTrue();
        expect(component.hasMore).toBeTrue();
        expect(component.isSearching).toBeFalse();
        expect(overlay.textContent).toContain('CAT-0001');
    }));

    it('keeps a searched selection visible when reopening the default first page', fakeAsync(() => {
        selectLastCategory();

        expect(component.selectedCategoryId).toBe(137);
        expect(component.keyword).toBe('');
        expect(component.categories.length).toBe(component.pageSize);
        expect(component.categories.some((item) => item.id === 137)).toBeFalse();
        expect(
            fixture.nativeElement.querySelector('.ant-select-selection-item')
                ?.textContent,
        ).toContain('CAT-0137');

        openDropdown();

        expect(
            overlay.querySelector('.ant-select-item-option-selected')?.textContent,
        ).toContain('CAT-0137');
        expect(
            select.listOfContainerItem.filter((item) => item.nzValue === 137)
                .length,
        ).toBe(1);
    }));

    it('preserves the selected label without adding it to unrelated search results', fakeAsync(() => {
        selectLastCategory();
        openDropdown();
        searchFor('CAT-0001');

        expect(component.selectedCategoryId).toBe(137);
        expect(
            select.listOfContainerItem.some((item) => item.nzValue === 137),
        ).toBeFalse();
        expect(component.categories.map((item) => item.id)).toEqual([1]);

        select.setOpenState(false);
        render();
        expect(
            fixture.nativeElement.querySelector('.ant-select-selection-item')
                ?.textContent,
        ).toContain('CAT-0137');
        tick(700);
        render();

        openDropdown();
        searchFor('CAT-0137');
        expect(
            select.listOfContainerItem.filter((item) => item.nzValue === 137)
                .length,
        ).toBe(1);
    }));

    it('clears the selection and restores the default list', fakeAsync(() => {
        selectLastCategory();
        openDropdown();
        searchFor('CAT-0001');

        fixture.nativeElement.querySelector('nz-select-clear').click();
        render();
        tick(700);
        render();

        expect(component.selectedCategoryId).toBeNull();
        expect(component.selectedCategory).toBeNull();
        expect(component.keyword).toBe('');
        expect(component.categories.length).toBe(component.pageSize);
        expect(
            select.listOfContainerItem.some((item) => item.nzValue === 137),
        ).toBeFalse();
    }));

    it('shows a length hint for short searches and reloads the first page when erased', fakeAsync(() => {
        component.onDropdownOpen(true);
        tick(700);
        component.onSearch('ca');
        tick(1050);
        render();

        expect(component.categories).toEqual([]);
        expect(component.hasSearched).toBeFalse();
        expect(component.isSearching).toBeFalse();
        expect(select.nzNotFoundContent).toContain('Nhập tối thiểu');

        component.onSearch('');
        expect(component.isSearching).toBeTrue();
        tick(700);

        expect(component.categories.length).toBe(component.pageSize);
        expect(component.hasSearched).toBeTrue();
    }));

    it('only displays the latest search when keywords change during a request', fakeAsync(() => {
        component.onSearch('CAT-0001');
        tick(350);
        component.onSearch('CAT-0137');
        tick(700);

        expect(component.categories).toEqual([]);
        expect(component.isSearching).toBeTrue();

        tick(350);

        expect(component.categories.map((item) => item.id)).toEqual([137]);
        expect(component.isSearching).toBeFalse();
    }));

    it('cancels pagination immediately when the keyword changes', fakeAsync(() => {
        component.onDropdownOpen(true);
        tick(700);
        component.onDropdownScrollToBottom();
        tick(600);

        component.onSearch('CAT-0137');
        expect(component.isLoadingMore).toBeFalse();
        tick(100);
        expect(component.categories).toEqual([]);
        tick(950);

        expect(component.categories.map((item) => item.id)).toEqual([137]);
        expect(component.hasMore).toBeFalse();
    }));

    it('loads consecutive pages once per scroll request without duplicate records', fakeAsync(() => {
        component.onDropdownOpen(true);
        tick(700);
        component.onDropdownScrollToBottom();
        component.onDropdownScrollToBottom();
        tick(700);

        expect(component.categories.length).toBe(component.pageSize * 2);
        expect(component.categories[component.pageSize].id).toBe(21);
        expect(component.categories[component.categories.length - 1].id).toBe(40);
        expect(new Set(component.categories.map((item) => item.id)).size).toBe(40);
        expect(component.isLoadingMore).toBeFalse();
    }));

    it('immediately shows a visible footer when jumping to the bottom without scrolling back up', fakeAsync(() => {
        openDropdown();
        tick(700);
        render();
        const viewport = overlay.querySelector<HTMLElement>(
            'cdk-virtual-scroll-viewport',
        )!;
        expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);

        const scrollToBottom = () => {
            TestBed.inject(NgZone).runOutsideAngular(() => {
                viewport.scrollTop = viewport.scrollHeight;
                viewport.dispatchEvent(new Event('scroll'));
            });
        };

        scrollToBottom();
        expect(component.isLoadingMore).toBeTrue();
        render();

        const loading = overlay.querySelector<HTMLElement>('[role="status"]')!;
        expect(loading.textContent).toContain('Đang tải thêm');
        expect(viewport.contains(loading)).toBeFalse();
        expect(loading.getBoundingClientRect().height).toBeGreaterThan(0);
        expect(loading.getBoundingClientRect().top).toBeGreaterThanOrEqual(
            viewport.getBoundingClientRect().bottom - 1,
        );
        expect(select.nzLoading).toBeTrue();

        scrollToBottom();
        tick(700);
        render();
        expect(component.categories.length).toBe(40);
        expect(component.isLoadingMore).toBeFalse();
        expect(overlay.querySelector('[role="status"]')).toBeNull();
        expect(select.nzLoading).toBeFalse();

        scrollToBottom();
        expect(component.isLoadingMore).toBeTrue();
        render();
        expect(overlay.querySelector('[role="status"]')?.textContent).toContain(
            'Đang tải thêm',
        );
        tick(700);
        render();
        expect(component.categories.length).toBe(60);
    }));

    it('stops loading when scrolling at the end of all records', fakeAsync(() => {
        openDropdown();
        tick(700);
        render();
        const viewport = overlay.querySelector<HTMLElement>(
            'cdk-virtual-scroll-viewport',
        )!;

        for (let page = 0; page < 6; page++) {
            viewport.scrollTop = viewport.scrollHeight;
            viewport.dispatchEvent(new Event('scroll'));
            tick(700);
            render();
        }

        expect(component.categories.length).toBe(137);
        expect(component.hasMore).toBeFalse();
        expect(overlay.textContent).toContain('Đã tải hết dữ liệu');

        viewport.scrollTop = viewport.scrollHeight;
        viewport.dispatchEvent(new Event('scroll'));
        render();

        expect(component.isLoadingMore).toBeFalse();
        expect(overlay.querySelector('[role="status"]')).toBeNull();
    }));

    it('shows the empty state only after a valid search returns no matches', fakeAsync(() => {
        openDropdown();
        searchFor('CAT-9999');

        expect(component.categories).toEqual([]);
        expect(component.hasSearched).toBeTrue();
        expect(component.isSearching).toBeFalse();
        expect(overlay.textContent).toContain('Không tìm thấy danh mục phù hợp');
    }));
});
