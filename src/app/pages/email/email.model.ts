export interface AttachmentDTO {
    id:          string;
    fileName:    string;
    contentType: string;
    fileSize:    number;
}

export interface EmailHistory {
    jobId:        string;
    fromUser:     string;
    toAddress:    string;
    subject:      string;
    status:       'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    errorMessage: string | null;
    attemptCount: number;
    createdAt:    string;   // ISO string từ backend
    updatedAt:    string | null;
    attachments:  AttachmentDTO[];
}

export interface EmailStatusPush {
    jobId:        string;
    status:       string;
    attemptCount: number;
    error:        string;
}

// Spring Page wrapper
export interface Page<T> {
    content:          T[];
    totalElements:    number;
    totalPages:       number;
    size:             number;
    number:           number;   // page hiện tại (0-based)
    first:            boolean;
    last:             boolean;
}
