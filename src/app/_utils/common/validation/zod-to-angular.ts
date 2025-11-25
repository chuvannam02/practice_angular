/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/14/2025
 * @Time: 1:11 AM
 * @File: zod-to-angular.ts
 */
import { FormBuilder, Validators, FormGroup } from "@angular/forms";
import { ZodTypeAny } from "zod";

export function buildFormFromZod<T extends ZodTypeAny>(
    fb: FormBuilder,
    schema: T
): FormGroup {
    let currentSchema: any = schema;

    // Helper để lấy typeName an toàn (dùng để unwrap)
    const getTypeName = (s: any): string => {
        return s?._def?.typeName || '';
    };

    // 1. Unwrap các lớp wrapper (Refine, Optional, Nullable, Effects)
    while (true) {
        const typeName = getTypeName(currentSchema);

        if (typeName === 'ZodEffects') {
            currentSchema = currentSchema._def.schema;
        } else if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
            currentSchema = currentSchema.unwrap();
        } else {
            break;
        }
    }

    // 2. [QUAN TRỌNG] Thay vì check tên "ZodObject", ta check xem schema có thuộc tính .shape hay không
    // Điều này giúp tránh lỗi nếu Zod bị minified hoặc typeName không khớp
    if (!currentSchema || typeof currentSchema !== 'object' || !('shape' in currentSchema)) {
        console.warn('buildFormFromZod: Schema provided does not have .shape property (not a ZodObject).', currentSchema);
        return fb.group({});
    }

    // 3. Lấy shape an toàn
    const shape = currentSchema.shape;
    const controls: Record<string, any> = {};

    for (const key in shape) {
        let fieldSchema = shape[key];
        const validators = [];

        // --- Xử lý Required vs Optional ---
        let isRequired = true;
        let fieldTypeName = getTypeName(fieldSchema);

        // Unwrap field nếu là Optional/Nullable
        while (fieldTypeName === 'ZodOptional' || fieldTypeName === 'ZodNullable') {
            isRequired = false;
            fieldSchema = fieldSchema.unwrap();
            fieldTypeName = getTypeName(fieldSchema);
        }

        if (isRequired) {
            validators.push(Validators.required);
        }

        // --- Xử lý String ---
        if (fieldTypeName === 'ZodString') {
            // Fix lỗi có thể undefined cho checks
            const checks = fieldSchema._def.checks || [];

            for (const check of checks) {
                const c = check as any;

                switch (c.kind) {
                    case "min":
                        validators.push(Validators.minLength(c.value));
                        break;
                    case "max":
                        validators.push(Validators.maxLength(c.value));
                        break;
                    case "email":
                        validators.push(Validators.email);
                        break;
                }
            }
        }

        // --- Xử lý Number ---
        if (fieldTypeName === 'ZodNumber') {
            const checks = fieldSchema._def.checks || [];

            for (const check of checks) {
                const c = check as any;

                switch (c.kind) {
                    case "min":
                        validators.push(Validators.min(c.value));
                        break;
                    case "max":
                        validators.push(Validators.max(c.value));
                        break;
                }
            }
        }

        controls[key] = [null, validators];
    }

    return fb.group(controls);
}
