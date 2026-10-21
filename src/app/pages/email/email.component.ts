import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ModuleShare } from '../../ng-zorror-antd.module';
import { EmailService } from './email.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { EmailHistory, EmailStatusPush } from './email.model';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector:    'app-email',
    standalone:  true,
    templateUrl: './email.component.html',
    imports: [
        ModuleShare
    ],
})
export class EmailComponent implements OnInit, OnDestroy {

    private readonly emailService = inject(EmailService);
    private readonly message      = inject(NzMessageService);
    private readonly fb           = inject(FormBuilder);
    private readonly destroy$     = new Subject<void>();

    // ---- form ----
    form: FormGroup = this.fb.group({
        to:          ['', [Validators.required, Validators.email]],
        subject:     ['', [Validators.required, Validators.maxLength(255)]],
        body:        [''],
        htmlContent: [false],
    });

    // ---- upload ----
    fileList: NzUploadFile[] = [];

    readonly beforeUpload = (file: NzUploadFile): boolean => {
        const maxMb = 10;
        const allowed = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
        ];
        const raw = file as unknown as File;

        if (raw.size > maxMb * 1024 * 1024) {
            this.message.error(`File "${file.name}" vượt quá ${maxMb}MB`);
            return false;
        }
        if (!allowed.includes(raw.type)) {
            this.message.error(`Loại file "${raw.type}" không được hỗ trợ`);
            return false;
        }

        this.fileList = [...this.fileList, file];
        return false;   // false = không tự upload lên server
    };

    readonly removeFile = (file: NzUploadFile): boolean => {
        this.fileList = this.fileList.filter(f => f.uid !== file.uid);
        return true;
    };

    // ---- table ----
    history:       EmailHistory[] = [];
    page           = 0;
    pageSize       = 10;
    totalElements  = 0;
    tableLoading   = false;
    submitting     = false;

    // ----------------------------------------------------------------
    // Lifecycle
    // ----------------------------------------------------------------
    ngOnInit(): void {
        this.emailService.connect();

        this.emailService.emailStatus$
            .pipe(takeUntil(this.destroy$))
            .subscribe((push: EmailStatusPush) => this.handleWsPush(push));

        this.loadHistory();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        // KHÔNG gọi disconnect() ở đây nếu EmailService là singleton
        // và các tab khác vẫn cần WS — tuỳ yêu cầu app
        this.emailService.disconnect();
    }

    // ----------------------------------------------------------------
    // Actions
    // ----------------------------------------------------------------
    submit(): void {
        if (this.form.invalid) {
            Object.values(this.form.controls)
                .forEach(c => { c.markAsDirty(); c.updateValueAndValidity(); });
            return;
        }

        this.submitting = true;
        const rawFiles  = this.fileList.map(f => f as unknown as File);

        this.emailService
            .sendEmail({ ...this.form.value, files: rawFiles })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    console.log(res);

                    this.message.info(`Đã đưa vào hàng chờ — job: ${res.jobId}`);
                    this.fileList = [];
                    this.form.reset({ htmlContent: false });
                    this.loadHistory();
                },
                error: (err) => {
                    this.message.error('Gửi thất bại: ' + (err.error?.message ?? err.message));
                },
                complete: () => {
                    this.submitting = false;
                },
            });
    }

    onPageChange(pageIndex: number): void {
        this.page = pageIndex - 1;
        this.loadHistory();
    }

    loadHistory(): void {
        this.tableLoading = true;
        this.emailService
            .getHistory(this.page, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (p) => {
                    this.history       = p.content;
                    this.totalElements = p.totalElements;
                    this.tableLoading = false;
                },
                error: () => {
                    this.message.error('Không tải được lịch sử');
                    this.tableLoading = false;
                },
                complete: () => { this.tableLoading = false; },
            });
    }

    // ----------------------------------------------------------------
    // WebSocket handler — cập nhật dòng hiện có, không reload toàn bộ
    // ----------------------------------------------------------------
    private handleWsPush(push: EmailStatusPush): void {
        const job = this.history.find(h => h.jobId === push.jobId);
        console.log("job::", job);

        console.log("push::", push);

        if (job) {
            // cập nhật trực tiếp dòng trong bảng
            job.status       = push.status.toUpperCase() as EmailHistory['status'];
            job.attemptCount = push.attemptCount;
            job.errorMessage = push.error || null;

            if (push.status === 'success') {
                this.message.success(`Email đến ${job.toAddress} đã gửi thành công!`);
            } else if (push.status === 'failed') {
                this.message.error(`Gửi thất bại: ${push.error}`);
            }
        } else {
            // job mới tạo từ tab khác → reload
            this.loadHistory();
        }
    }

    // ----------------------------------------------------------------
    // Helpers template
    // ----------------------------------------------------------------
    statusColor(s: string): string {
        const map: Record<string, string> = {
            PENDING:    'default',
            PROCESSING: 'processing',
            SUCCESS:    'success',
            FAILED:     'error',
        };
        return map[s] ?? 'default';
    }

    statusLabel(s: string): string {
        const map: Record<string, string> = {
            PENDING:    'Đang chờ',
            PROCESSING: 'Đang gửi',
            SUCCESS:    'Thành công',
            FAILED:     'Thất bại',
        };
        return map[s] ?? s;
    }

    fileSizeLabel(bytes: number): string {
        if (bytes < 1024)       return `${bytes} B`;
        if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    }

    trackByJobId(_: number, item: EmailHistory): string {
        return item.jobId;
    }
}
