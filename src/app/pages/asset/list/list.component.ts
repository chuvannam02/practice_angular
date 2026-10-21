import { Component, OnInit } from '@angular/core';
import { ModuleShare } from '../../../ng-zorror-antd.module';
import { Asset } from '../asset.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AssetService } from '../asset.service';
@Component({
    selector: 'app-list',
    imports: [ModuleShare],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss',
    standalone: true,
})
export class ListComponent implements OnInit {
    assetList: Asset[] = [];

    searchKeyword = '';
    selectedStatus = '';
    selectedLocation = '';

    // Modal
    isModalVisible = false;
    modalTitle = 'New Asset';
    assetForm!: FormGroup;
    editingAssetId: number | null = null;

    // Drawer
    isViewDrawerVisible = false;
    selectedAsset: Asset | null = null;

    constructor(
        private assetService: AssetService,
        private fb: FormBuilder,
    ) {}

    ngOnInit(): void {
        this.initForm();
        this.loadAssets();
    }

    initForm(): void {
        this.assetForm = this.fb.group({
            assetCode: ['', Validators.required],
            name: ['', Validators.required],
            category: ['', Validators.required],
            status: ['In Stock', Validators.required],
            location: ['', Validators.required],
            assignedTo: ['', Validators.required],
            purchaseDate: [null, Validators.required],
            cost: [0, [Validators.required, Validators.min(0)]],
        });
    }

    loadAssets(): void {
        this.assetService
            .getAssets(
                this.searchKeyword,
                this.selectedStatus,
                this.selectedLocation,
            )
            .subscribe({
                next: (data) => {
                    this.assetList = data;
                },
                error: (err) => {
                    console.error(err);
                },
            });
    }

    openCreateModal(): void {
        this.editingAssetId = null;
        this.modalTitle = 'New Asset';

        this.assetForm.reset({
            status: 'In Stock',
            cost: 0,
        });

        this.isModalVisible = true;
    }

    openEditModal(asset: Asset): void {
        this.editingAssetId = asset.id ?? null;
        this.modalTitle = 'Edit Asset';

        this.assetForm.patchValue({
            ...asset,
            purchaseDate: asset.purchaseDate
                ? new Date(asset.purchaseDate)
                : null,
        });

        this.isModalVisible = true;
    }

    handleCancel(): void {
        this.isModalVisible = false;
        this.assetForm.reset();
    }

    handleSave(): void {
        if (this.assetForm.invalid) {
            this.assetForm.markAllAsTouched();
            return;
        }

        const assetData = this.assetForm.getRawValue();

        if (this.editingAssetId) {
            this.assetService
                .updateAsset(this.editingAssetId, assetData)
                .subscribe(() => {
                    this.loadAssets();
                    this.isModalVisible = false;
                });
        } else {
            this.assetService.createAsset(assetData).subscribe(() => {
                this.loadAssets();
                this.isModalVisible = false;
            });
        }
    }

    deleteAsset(id: number): void {
        this.assetService.deleteAsset(id).subscribe(() => {
            this.loadAssets();
        });
    }

    openViewDrawer(asset: Asset): void {
        this.selectedAsset = asset;
        this.isViewDrawerVisible = true;
    }

    closeViewDrawer(): void {
        this.isViewDrawerVisible = false;
        this.selectedAsset = null;
    }

    getTagColor(status: string): string {
        switch (status) {
            case 'Active':
                return 'green';

            case 'Maintenance':
                return 'blue';

            case 'Pending':
                return 'orange';

            case 'Disposed':
                return 'red';

            case 'In Stock':
                return 'cyan';

            default:
                return 'default';
        }
    }
}
