import { HttpClient } from '@angular/common/http';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { EmailHistory, EmailStatusPush, Page } from './email.model';
import { Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface SendEmailPayload {
    to: string;
    subject: string;
    body: string;
    files: File[];
}

@Injectable({ providedIn: 'root' })
export class EmailService implements OnDestroy {
    private readonly http = inject(HttpClient);

    private stompClient!: Client;

    private readonly _emailStatus$ = new Subject<EmailStatusPush>();

    /** Component subscribe vào đây để nhận push từ WebSocket */
    readonly emailStatus$ = this._emailStatus$.asObservable();

    private readonly baseURL = 'http://localhost:8080';

    // ----------------------------------------------------------------
    // WebSocket
    // ----------------------------------------------------------------
    connect(): void {
        if (this.stompClient?.active) return; // tránh connect 2 lần

        this.stompClient = new Client({
            webSocketFactory: () => new SockJS(`${this.baseURL}/ws`),

            reconnectDelay: 5000, // tự reconnect sau 5s nếu mất kết nối
            connectHeaders: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },

            onConnect: () => {
                // Spring route đến đúng user nhờ Principal (JWT/Session)
                this.stompClient.subscribe(
                    '/user/queue/email-status',
                    (msg: IMessage) => {
                        const push = JSON.parse(msg.body) as EmailStatusPush;
                        this._emailStatus$.next(push);
                    },
                );
            },

            onStompError: (frame) => {
                console.error('STOMP error', frame);
            },
        });

        this.stompClient.activate();
    }

    disconnect(): void {
        this.stompClient?.deactivate();
    }

    ngOnDestroy(): void {
        this.disconnect();
        this._emailStatus$.complete();
    }

    // ----------------------------------------------------------------
    // HTTP
    // ----------------------------------------------------------------
    sendEmail(payload: SendEmailPayload) {
        const form = new FormData();
        form.append('to', payload.to);
        form.append('subject', payload.subject);
        form.append('body', payload.body);
        payload.files.forEach((f) => form.append('attachments', f, f.name));
        // KHÔNG set Content-Type — browser tự gán multipart boundary
        return this.http.post<{ jobId: string; status: string }>(
            `${this.baseURL}/emails`,
            form,
        );
    }

    getHistory(page = 0, size = 10) {
        return this.http.get<Page<EmailHistory>>(
            `${this.baseURL}/emails/history?page=${page}&size=${size}`,
        );
    }

    getJob(jobId: string) {
        return this.http.get<EmailHistory>(
            `${this.baseURL}/emails/jobs/${jobId}`,
        );
    }
}
