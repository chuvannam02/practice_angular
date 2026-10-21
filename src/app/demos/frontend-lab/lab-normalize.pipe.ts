import { Pipe, PipeTransform, inject } from '@angular/core';
import { LabMetrics, normalizeLabText } from './lab-metrics';

@Pipe({ name: 'labNormalize', standalone: true, pure: true })
export class LabNormalizePipe implements PipeTransform {
    private readonly metrics = inject(LabMetrics);

    transform(value: string): string {
        // Instrumentation for the lesson; the displayed result depends only on value.
        this.metrics.pipe++;
        return normalizeLabText(value);
    }
}
