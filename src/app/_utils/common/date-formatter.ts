/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/25/2025
 * @Time: 10:29 AM
 * @File: date-formatter.ts
 */
type Locale = 'en-US' | 'vi-VN' | string;
type DateFormat = 'DD/MM/YYYY' | 'MM-DD-YYYY' | string | 'YYYY/MM/DD' | 'YYYY-MM-DD' | 'DD' | 'MM' | 'YYYY';
/**
 * Hàm định dạng ngày tháng với các kiểu input khác nhau
 * @param date
 * @return Chuỗi ngày tháng đã định dạng
 * @example
 * ```typescript
 * formatDate(new Date());
 * formatDate(Date.now());
 * formatDate("2024-01-01T00:00:00Z", "MM-DD-YYYY");
 * ```
 */
// Signature 1: Input là Date object
function formatDate(date: Date): string;
// Signature 2: Input là timestamp (number)
function formatDate(timestamp: number): string;
// Signature 3: Input là ISO string, nhưng cho phép định dạng format khác
function formatDate(isoString: string, format?: string): string;
// Signature 4: Input là ISO string với định dạng và locale tùy chỉnh
function formatDate(isoString: string, format: string, locale: Locale): string;

// Implementation
function formatDate(input: Date | number | string, format: DateFormat = 'DD/MM/YYYY', locale: Locale = "vi-VN"): string {
    let dateObj: Date;

    if (input instanceof Date) {
        dateObj = input;
    } else if (typeof input === 'number') {
        dateObj = new Date(input);
    } else if (typeof input === 'string') {
        dateObj = new Date(input);
    } else {
        throw new Error('Invalid date input');
    }

    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString();

    switch (format) {
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'MM-DD-YYYY':
            return `${month}-${day}-${year}`;
        case 'YYYY/MM/DD':
            return `${year}/${month}/${day}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD':
            return day;
        case 'MM':
            return month;
        case 'YYYY':
            return year;
        default:
            // Fallback to locale string if format is unrecognized
            return dateObj.toLocaleDateString(locale);
    }
}

export {formatDate};
