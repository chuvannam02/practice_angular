import { Injectable } from '@angular/core';

export interface CalculationCounts {
    method: number;
    pipe: number;
    computed: number;
}

@Injectable()
export class LabMetrics {
    method = 0;
    pipe = 0;
    computed = 0;
    timerTicks = 0;

    snapshot(): CalculationCounts {
        return { method: this.method, pipe: this.pipe, computed: this.computed };
    }
}

export function normalizeLabText(value: string): string {
    return value.trim().toLocaleLowerCase('vi-VN');
}
